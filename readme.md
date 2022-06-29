# Billing Notifier

This service looks at our billing usage and reports it into Slack weekly (or whatever)

It runs in the account you want to report on (we call ours billing) as thats were all the money goes from. If you are not rolling your billing up to a central account, you should - and use
oranisations :) Or just deploy this into a few places.

billing
  - development
  - production
  - marketing
  - dns
  - others


Inspired by [Pushpay](https://github.com/pushpay), rewritten for [Tend Health](https://github.com/tendnz)

# Still needs doing

## Make an IAM role with the following, and add the ARN into `serverless.yml`

```yml
provider:
  name: aws
  ...
  iam:
    role: 'arn-of-your-role-here'
```

```hcl
  statement {
    effect = "Allow"
    actions = [
      "ce:GetCostAndUsage",
    ]

    resources = [
      "arn:aws:ce:us-east-1:__BILLING_ACCOUNT_ID_HERE__:*",
    ]
  }
```

## Set up a slack token and account

```yml
  environment:
    AWS_NODEJS_CONNECTION_REUSE_ENABLED: 1
    AWS_EMF_ENVIRONMENT: Lambda
    SLACK_TOKEN: 'xoxb-99999-88888-Example'
    SLACK_CHANNEL: '#slack-channel-here'
```

## If you use a serverless state bucket, add it in

You should. But you don't have to.

```yml
  deploymentBucket:
    name: your-serverless-state-bucket-here
    serverSideEncryption: AES256
```

## Add your account ID mapping

`billing-notifier/main.ts`

```typescript
const findAccountName = (accountId: string) => {
  switch (accountId) {
    case '987654321':
      return 'your-account-name';
    case '123456789':
      return 'other-account-name';
    default:
      return `unknown-${accountId}`;
  }
};
```