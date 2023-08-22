import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { RDSDatabaseAutoRunningStopper } from '../src';

describe('RDSDatabaseAutoRunningStopper Default Testing', () => {

  const app = new App();
  const stack = new Stack(app, 'TestingStack', {
    env: {
      account: '123456789012',
      region: 'us-east-1',
    },
  });

  new RDSDatabaseAutoRunningStopper(stack, 'RDSDatabaseAutoRunningStopper');

  const template = Template.fromStack(stack);

  it('Should match state machine default policy', () => {
    template.hasResourceProperties('AWS::IAM::Policy', Match.objectEquals({
      PolicyName: Match.stringLikeRegexp('rds-database-auto-running-stopper-state-machine-default-.*-policy'),
      Description: Match.anyValue(),
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: Match.arrayEquals([
          {
            Action: 'rds:describeDBInstances',
            Effect: 'Allow',
            Resource: 'arn:aws:rds:*:123456789012:db:*',
          },
          {
            Action: 'rds:stopDBInstance',
            Effect: 'Allow',
            Resource: 'arn:aws:rds:*:123456789012:db:*',
          },
          {
            Action: 'rds:stopDBCluster',
            Effect: 'Allow',
            Resource: 'arn:aws:rds:*:123456789012:cluster:*',
          },
          {
            Action: 'rds:describeDBClusters',
            Effect: 'Allow',
            Resource: 'arn:aws:rds:*:123456789012:cluster:*',
          },
        ]),
      },
      Roles: [
        {
          Ref: Match.stringLikeRegexp('RDSDatabaseAutoRunningStopperStateMachineRole.*'),
        },
      ],
    }));
  });

  it('Should match state machine iam role', () => {
    template.hasResourceProperties('AWS::IAM::Role', Match.objectEquals({
      RoleName: Match.stringLikeRegexp('rds-database-auto-running-stopper-state-machine-.*-role'),
      Description: Match.anyValue(),
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: Match.arrayEquals([
          Match.objectEquals({
            Effect: 'Allow',
            Principal: {
              Service: 'states.us-east-1.amazonaws.com', // require region
            },
            Action: 'sts:AssumeRole',
          }),
        ]),
      },
    }));
  });

  it('Should match event\'s state machine execution iam role', () => {
    template.hasResourceProperties('AWS::IAM::Role', Match.objectEquals({
      RoleName: Match.stringLikeRegexp('db-auto-start-catch-event-.*-role'),
      Description: Match.anyValue(),
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: Match.arrayEquals([
          Match.objectEquals({
            Effect: 'Allow',
            Principal: {
              Service: 'events.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          }),
        ]),
      },
      Policies: Match.arrayEquals([
        {
          PolicyName: 'state-machine-exec',
          PolicyDocument: Match.objectEquals({
            Version: '2012-10-17',
            Statement: [
              Match.objectEquals({
                Effect: 'Allow',
                Action: 'states:StartExecution',
                Resource: {
                  Ref: Match.stringLikeRegexp('RDSDatabaseAutoRunningStopperStateMachine.*'),
                },
              }),
            ],
          }),
        },
      ]),
    }));
  });

  it('Should match event rule (RDS-EVENT-0154).', () => {
    template.hasResourceProperties('AWS::Events::Rule', Match.objectEquals({
      Name: Match.stringLikeRegexp('db-instance-start-event-catch-.*-rule'),
      State: 'ENABLED',
      Description: Match.anyValue(),
      EventPattern: {
        'source': ['aws.rds'],
        'detail-type': ['RDS DB Instance Event'],
        'detail': {
          EventID: ['RDS-EVENT-0154'],
        },
      },
      Targets: Match.arrayEquals([
        {
          Arn: {
            Ref: Match.stringLikeRegexp('RDSDatabaseAutoRunningStopperStateMachine.*'),
          },
          Id: Match.anyValue(),
          RoleArn: {
            'Fn::GetAtt': Match.arrayEquals([
              Match.stringLikeRegexp('RDSDatabaseAutoRunningStopperEventExecRole.*'),
              'Arn',
            ]),
          },
        },
      ]),
    }));
  });

  it('Should match event rule (RDS-EVENT-0153).', () => {
    template.hasResourceProperties('AWS::Events::Rule', Match.objectEquals({
      Name: Match.stringLikeRegexp('db-cluster-start-event-catch-.*-rule'),
      State: 'ENABLED',
      Description: Match.anyValue(),
      EventPattern: {
        'source': ['aws.rds'],
        'detail-type': ['RDS DB Cluster Event'],
        'detail': {
          EventID: ['RDS-EVENT-0153'],
        },
      },
      Targets: Match.arrayEquals([
        {
          Arn: {
            Ref: Match.stringLikeRegexp('RDSDatabaseAutoRunningStopperStateMachine.*'),
          },
          Id: Match.anyValue(),
          RoleArn: {
            'Fn::GetAtt': Match.arrayEquals([
              Match.stringLikeRegexp('RDSDatabaseAutoRunningStopperEventExecRole.*'),
              'Arn',
            ]),
          },
        },
      ]),
    }));
  });

  it('Should match snapshot', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });

});
