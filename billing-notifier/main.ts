import AWS from 'aws-sdk';
import {DateInterval, GroupDefinitions, ResultByTime} from 'aws-sdk/clients/costexplorer';
import moment from 'moment';

import {config} from '../config';
import {postMessage} from '../shared/slack';

const ce = new AWS.CostExplorer({region: 'us-east-1'});

interface GroupedTotal {
  key: string;
  total: number;
}

export const handler = async () => {
  const withLinkedAccount = await getCostAndUsage(getCurrentDateRange(), [
    {
      Type: 'DIMENSION',
      Key: 'LINKED_ACCOUNT',
    },
  ]);

  const withService = await getCostAndUsage(getCurrentDateRange(), [
    {
      Type: 'DIMENSION',
      Key: 'SERVICE',
    },
  ]);

  const lastMonth = await getCostAndUsage(getLastMonthRange(), [
    {
      Type: 'DIMENSION',
      Key: 'LINKED_ACCOUNT',
    },
  ]);

  const totals = {
    cost: sumAll(withLinkedAccount),
    lastMonth: sumAll(lastMonth),
    byService: sumByGroup(withService),
    byAccount: sumByGroup(withLinkedAccount),
  };

  const sectionForAccounts = totals.byAccount.map((item) => {
    return {
      type: 'section',
      text: {
        text: `*${findAccountName(item.key)}*: \$${item.total.toFixed(2)} (${item.key})`,
        type: 'mrkdwn',
      },
    };
  });

  const sectionForServices = totals.byService.map((item) => {
    return {
      type: 'section',
      text: {
        text: `*${item.key}*: \$${item.total.toFixed(2)}`,
        type: 'mrkdwn',
      },
    };
  });

  await postMessage(
    {
      channel: config.slackChannel,
      username: 'BlingBling Bot - AWS Spend',
      icon_emoji: ':money_with_wings:',
    },
    [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':money_with_wings:  AWS Spend :money_with_wings:',
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Total AWS Spend this month: *\$${totals.cost.toFixed(2)}*`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Total AWS Spend last month: *\$${totals.lastMonth.toFixed(2)}*`,
        },
      },
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':money_with_wings:  By Account',
        },
      },
      ...sectionForAccounts,
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':money_with_wings:  By Service',
        },
      },
      ...sectionForServices,
    ],
  );
};

const sumAll = (results: ResultByTime) => {
  let total: number = 0;

  results.Groups!.forEach((item) => {
    for (const key in item.Metrics) {
      const metric = item.Metrics[key];
      total += Number(metric.Amount);
    }
  });
  return total;
};

const sumByGroup = (results: ResultByTime) => {
  let total: GroupedTotal[] = [];
  results.Groups!.forEach((item) => {
    if (item.Keys && item.Metrics) {
      const key = item.Keys[0];
      const metric = item.Metrics['UnblendedCost'];

      const totaledItem = total.find((x) => x.key === key);
      if (totaledItem) {
        totaledItem.total += Number(metric.Amount);
      } else {
        total.push({
          key,
          total: Number(metric.Amount),
        });
      }
    }
  });

  return total;
};

const getCostAndUsage = async (timePeriod: DateInterval, groupBy: GroupDefinitions) => {
  const params: AWS.CostExplorer.GetCostAndUsageRequest = {
    Metrics: ['UnblendedCost'],
    TimePeriod: timePeriod,
    Filter: {
      Dimensions: {
        Key: 'RECORD_TYPE',
        Values: ['Usage'],
        MatchOptions: ['EQUALS'],
      },
    },
    Granularity: 'MONTHLY',
    GroupBy: groupBy,
  };

  const res: AWS.CostExplorer.GetCostAndUsageResponse = await ce.getCostAndUsage(params).promise();

  return res.ResultsByTime![0];
};

const getCurrentDateRange = () => {
  const now = moment();
  return {
    End: now.endOf('month').format('yyyy-MM-DD'),
    Start: now.startOf('month').format('yyyy-MM-DD'),
  };
};

const getLastMonthRange = () => {
  const now = moment().startOf('month').add(-1, 'month');
  return {
    End: now.endOf('month').format('yyyy-MM-DD'),
    Start: now.startOf('month').format('yyyy-MM-DD'),
  };
};

const findAccountName = (accountId: string) => {
  switch (accountId) {
    case '987654321':
      return 'your-account-name';
    default:
      return `unknown-${accountId}`;
  }
};
