import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { IntegrationRepository } from '@novu/dal';

const ORIGINAL_IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;

describe('Get Decrypted Integrations - /integrations (GET)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = 'true';
  });

  afterEach(async () => {
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = ORIGINAL_IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;
  });

  it('should get active decrypted integration', async function () {
    const payload = {
      providerId: EmailProviderIdEnum.Mailgun,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    await session.testAgent.post('/v1/integrations').send(payload);

    const result = (await session.testAgent.get(`/v1/integrations/active`)).body.data;

    // We expect to find the test data 15 with the email one
    expect(result.length).to.eq(15);

    const activeEmailIntegrations = result.filter(
      (integration) =>
        integration.channel == ChannelTypeEnum.EMAIL && integration._environmentId === session.environment._id
    );

    expect(activeEmailIntegrations.length).to.eq(3);

    const mailgun = activeEmailIntegrations.find((el) => el.providerId === EmailProviderIdEnum.Mailgun);

    expect(mailgun.providerId).to.equal('mailgun');
    expect(mailgun.credentials.apiKey).to.equal('123');
    expect(mailgun.credentials.secretKey).to.equal('abc');
    expect(mailgun.active).to.equal(true);

    const environmentIntegrations = await integrationRepository.findByEnvironmentId(session.environment._id);

    // We expect to find the test data 6 plus the one created
    expect(environmentIntegrations.length).to.eq(7);

    const encryptedStoredIntegration = environmentIntegrations.find(
      (i) => i.providerId.toString() === EmailProviderIdEnum.Mailgun
    );

    expect(encryptedStoredIntegration?.providerId).to.equal('mailgun');
    expect(encryptedStoredIntegration?.credentials.apiKey).to.contains('nvsk.');
    expect(encryptedStoredIntegration?.credentials.apiKey).to.not.equal('123');
    expect(encryptedStoredIntegration?.credentials.secretKey).to.contains('nvsk.');
    expect(encryptedStoredIntegration?.credentials.secretKey).to.not.equal('abc');
    expect(encryptedStoredIntegration?.active).to.equal(true);
  });
});
