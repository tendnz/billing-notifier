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

You can do this in the serverless.yml, but I like to keep it outside of serverless.

```yml
provider:
  name: aws
  ...
  iam:
    role: 'arn-of-your-role-here'
```

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Action": "ce:GetCostAndUsage",
            "Resource": "arn:aws:ce:us-east-1:__billing account id here__:*"
        }
    ]
}
```

It'll also need the usual log group access etc.

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

## Change the cron as needed

We are UTC+12 or 13, hence the weirdness

```yml
functions:
  billing-notifier:
    handler: .build/billing-notifier/main.handler
    events:
      # 7am every monday = 7pm sunday UTC
      - schedule: cron(0 19 ? * SUN *)
      # 3pm every friday = 3am friday UTC
      - schedule: cron(0 3 ? * FRI *)
      # 7am on the 5th day of the month = 7pm on the 4th day of the month
      - schedule: cron(0 19 4 * ? *)

```