import React from 'react';

import { IconButton, Separator } from 'storybook/internal/components';
import type { Addon_BaseType } from 'storybook/internal/types';

import { MenuIcon } from '@storybook/icons';

import { Consumer, types } from 'storybook/manager-api';
import type { Combo } from 'storybook/manager-api';

const menuMapper = ({ api, state }: Combo) => ({
  isVisible: api.getIsNavShown(),
  singleStory: state.singleStory,
  toggle: () => api.toggleNav(),
});

export const menuTool: Addon_BaseType = {
  title: 'menu',
  id: 'menu',
  type: types.TOOL,
  // @ts-expect-error (non strict)
  match: ({ viewMode }) => ['story', 'docs'].includes(viewMode),
  render: () => (
    <Consumer filter={menuMapper}>
      {({ isVisible, toggle, singleStory }) =>
        !singleStory &&
        !isVisible && (
          <>
            <IconButton aria-label="Show sidebar" key="menu" onClick={toggle} title="Show sidebar">
              <MenuIcon />
            </IconButton>
            <Separator />
          </>
        )
      }
    </Consumer>
  ),
};
