import { useMemo } from 'react';
import * as cloneDeep from 'lodash.clonedeep';
import { ChannelTypeEnum, IProviderConfig, providers, PushProviderIdEnum } from '@novu/shared';

import { useIntegrations, useIsMultiProviderConfigurationEnabled } from '../../hooks';
import { IIntegratedProvider, IntegrationEntity } from './IntegrationsStorePage';

/*
 * temporary patch before migration script
 */
function fcmFallback(integration: IntegrationEntity | undefined, clonedCredentials) {
  if (integration?.providerId === PushProviderIdEnum.FCM) {
    const serviceAccount = integration?.credentials.serviceAccount
      ? integration?.credentials.serviceAccount
      : integration?.credentials.user;

    clonedCredentials?.forEach((cred) => {
      if (cred.key === 'serviceAccount') {
        cred.value = serviceAccount;
      }
    });
  }
}

function initializeProviders(integrations: IntegrationEntity[]): IIntegratedProvider[] {
  return providers.map((providerItem) => {
    const integration = integrations.find((integrationItem) => integrationItem.providerId === providerItem.id);

    const clonedCredentials = cloneDeep(providerItem.credentials);

    if (integration?.credentials && Object.keys(clonedCredentials).length !== 0) {
      clonedCredentials.forEach((credential) => {
        // eslint-disable-next-line no-param-reassign
        credential.value = integration.credentials[credential.key]?.toString();
      });
    }

    // Remove this like after the run of the fcm-credentials-migration script
    fcmFallback(integration, clonedCredentials);

    return {
      providerId: providerItem.id,
      integrationId: integration?._id ? integration._id : '',
      displayName: providerItem.displayName,
      channel: providerItem.channel,
      credentials: integration?.credentials ? clonedCredentials : providerItem.credentials,
      docReference: providerItem.docReference,
      comingSoon: !!providerItem.comingSoon,
      betaVersion: !!providerItem.betaVersion,
      active: integration?.active ?? false,
      connected: !!integration,
      logoFileName: providerItem.logoFileName,
      environmentId: integration?._environmentId,
    };
  });
}

function initializeProvidersByIntegration(integrations: IntegrationEntity[]): IIntegratedProvider[] {
  return integrations.map((integrationItem) => {
    const providerItem = providers.find((provItem) => integrationItem.providerId === provItem.id) as IProviderConfig;

    const clonedCredentials = cloneDeep(providerItem?.credentials);

    if (
      typeof clonedCredentials === 'object' &&
      integrationItem?.credentials &&
      Object.keys(clonedCredentials).length !== 0
    ) {
      clonedCredentials.forEach((credential) => {
        // eslint-disable-next-line no-param-reassign
        credential.value = integrationItem.credentials[credential.key]?.toString();
      });
    }

    // Remove this like after the run of the fcm-credentials-migration script
    fcmFallback(integrationItem, clonedCredentials);

    return {
      providerId: providerItem?.id || integrationItem.providerId,
      integrationId: integrationItem?._id ? integrationItem._id : '',
      displayName: providerItem?.displayName || integrationItem.name,
      channel: providerItem?.channel || integrationItem.channel,
      credentials: (integrationItem?.credentials ? clonedCredentials : providerItem?.credentials) || [],
      docReference: providerItem?.docReference || '',
      comingSoon: !!providerItem?.comingSoon,
      betaVersion: !!providerItem?.betaVersion,
      active: integrationItem?.active ?? false,
      connected: !!integrationItem,
      logoFileName: providerItem?.logoFileName,
      environmentId: integrationItem?._environmentId,
      name: integrationItem?.name,
      identifier: integrationItem?.identifier,
    };
  });
}

function isConnected(provider: IIntegratedProvider) {
  if (!provider.credentials.length) return false;

  return provider.credentials?.some((cred) => {
    return cred.value;
  });
}

const sortProviders = (unsortedProviders: IIntegratedProvider[]) => {
  return unsortedProviders
    .sort((a, b) => Number(b.active) - Number(a.active))
    .sort((a, b) => Number(isConnected(b)) - Number(isConnected(a)));
};

export const useProviders = () => {
  const { integrations, loading: isLoading, refetch } = useIntegrations();
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();

  const sortedProviders = useMemo(() => {
    if (integrations) {
      const initializedProviders = isMultiProviderConfigurationEnabled
        ? initializeProvidersByIntegration(integrations)
        : initializeProviders(integrations);

      return {
        emailProviders: sortProviders(
          initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.EMAIL)
        ),
        smsProvider: sortProviders(
          initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.SMS)
        ),
        chatProvider: sortProviders(
          initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.CHAT)
        ),
        pushProvider: sortProviders(
          initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.PUSH)
        ),
        inAppProvider: sortProviders(
          initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.IN_APP)
        ),
        providers: initializedProviders,
      };
    }

    return {
      emailProviders: [],
      smsProvider: [],
      chatProvider: [],
      pushProvider: [],
      inAppProvider: [],
      providers: [],
    };
  }, [integrations]);

  return {
    ...sortedProviders,
    isLoading,
    refetch,
  };
};
