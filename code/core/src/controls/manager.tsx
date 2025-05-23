import React from 'react';

import { AddonPanel, Badge } from 'storybook/internal/components';
import type {
  ResponseData,
  SaveStoryRequestPayload,
  SaveStoryResponsePayload,
} from 'storybook/internal/core-events';
import { SAVE_STORY_REQUEST, SAVE_STORY_RESPONSE } from 'storybook/internal/core-events';
import type { Args } from 'storybook/internal/csf';

import { FailedIcon, PassedIcon } from '@storybook/icons';

import { dequal as deepEqual } from 'dequal';
import {
  addons,
  experimental_requestResponse,
  types,
  useArgTypes,
  useStorybookApi,
} from 'storybook/manager-api';
import { color } from 'storybook/theming';

import { ControlsPanel } from './components/ControlsPanel';
import { ADDON_ID, PARAM_KEY } from './constants';

function Title() {
  const api = useStorybookApi();
  const selectedPanel = api.getSelectedPanel();
  const rows = useArgTypes();
  const controlsCount = Object.values(rows).filter(
    (argType) => argType?.control && !argType?.table?.disable
  ).length;
  const suffix =
    controlsCount === 0 ? null : (
      <Badge compact status={selectedPanel === ADDON_ID ? 'active' : 'neutral'}>
        {controlsCount}
      </Badge>
    );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>Controls</span>
      {suffix}
    </div>
  );
}

const stringifyArgs = (args: Record<string, any>) =>
  JSON.stringify(args, (_, value) => {
    if (typeof value === 'function') {
      return '__sb_empty_function_arg__';
    }
    return value;
  });

export default addons.register(ADDON_ID, (api) => {
  const channel = addons.getChannel();

  const saveStory = async () => {
    const data = api.getCurrentStoryData();

    if (data.type !== 'story') {
      throw new Error('Not a story');
    }

    try {
      const response = await experimental_requestResponse<
        SaveStoryRequestPayload,
        SaveStoryResponsePayload
      >(channel, SAVE_STORY_REQUEST, SAVE_STORY_RESPONSE, {
        // Only send updated args
        args: stringifyArgs(
          Object.entries(data.args || {}).reduce<Args>((acc, [key, value]) => {
            if (!deepEqual(value, data.initialArgs?.[key])) {
              acc[key] = value;
            }
            return acc;
          }, {})
        ),
        csfId: data.id,
        importPath: data.importPath,
      });

      api.addNotification({
        id: 'save-story-success',
        icon: <PassedIcon color={color.positive} />,
        content: {
          headline: 'Story saved',
          subHeadline: (
            <>
              Updated story <b>{response.sourceStoryName}</b>.
            </>
          ),
        },
        duration: 8_000,
      });
    } catch (error: any) {
      api.addNotification({
        id: 'save-story-error',
        icon: <FailedIcon color={color.negative} />,
        content: {
          headline: 'Failed to save story',
          subHeadline:
            error?.message || 'Check the Storybook process on the command line for more details.',
        },
        duration: 8_000,
      });
      throw error;
    }
  };

  const createStory = async (name: string) => {
    const data = api.getCurrentStoryData();

    if (data.type !== 'story') {
      throw new Error('Not a story');
    }

    const response = await experimental_requestResponse<
      SaveStoryRequestPayload,
      SaveStoryResponsePayload
    >(channel, SAVE_STORY_REQUEST, SAVE_STORY_RESPONSE, {
      args: data.args && stringifyArgs(data.args),
      csfId: data.id,
      importPath: data.importPath,
      name,
    });

    api.addNotification({
      id: 'save-story-success',
      icon: <PassedIcon color={color.positive} />,
      content: {
        headline: 'Story created',
        subHeadline: (
          <>
            Added story <b>{response.newStoryName}</b> based on <b>{response.sourceStoryName}</b>.
          </>
        ),
      },
      duration: 8_000,
      onClick: ({ onDismiss }) => {
        onDismiss();
        api.selectStory(response.newStoryId);
      },
    });
  };

  addons.add(ADDON_ID, {
    title: Title,
    type: types.PANEL,
    paramKey: PARAM_KEY,
    render: ({ active }) => {
      if (!active || !api.getCurrentStoryData()) {
        return null;
      }
      return (
        <AddonPanel active={active}>
          <ControlsPanel saveStory={saveStory} createStory={createStory} />
        </AddonPanel>
      );
    },
  });

  channel.on(SAVE_STORY_RESPONSE, (data: ResponseData<SaveStoryResponsePayload>) => {
    if (!data.success) {
      return;
    }
    const story = api.getCurrentStoryData();

    if (story.type !== 'story') {
      return;
    }

    api.resetStoryArgs(story);
    if (data.payload.newStoryId) {
      api.selectStory(data.payload.newStoryId);
    }
  });
});
