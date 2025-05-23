import type * as React from 'react';

import type { Addon_DecoratorFunction, LoaderFunction } from 'storybook/internal/types';

import type { ReactRenderer, StoryFn } from '@storybook/react';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore we must ignore types here as during compilation they are not generated yet
import { createNavigation } from '@storybook/nextjs-vite/navigation.mock';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore we must ignore types here as during compilation they are not generated yet
import { createRouter } from '@storybook/nextjs-vite/router.mock';

import { isNextRouterError } from 'next/dist/client/components/is-next-router-error';

import './config/preview';
import { HeadManagerDecorator } from './head-manager/decorator';
import { ImageDecorator } from './images/decorator';
import { RouterDecorator } from './routing/decorator';
import { StyledJsxDecorator } from './styledJsx/decorator';

function addNextHeadCount() {
  const meta = document.createElement('meta');
  meta.name = 'next-head-count';
  meta.content = '0';
  document.head.appendChild(meta);
}

function isAsyncClientComponentError(error: unknown) {
  return (
    typeof error === 'string' &&
    (error.includes('Only Server Components can be async at the moment.') ||
      error.includes('A component was suspended by an uncached promise.') ||
      error.includes('async/await is not yet supported in Client Components'))
  );
}
addNextHeadCount();

// Copying Next patch of console.error:
// https://github.com/vercel/next.js/blob/a74deb63e310df473583ab6f7c1783bc609ca236/packages/next/src/client/app-index.tsx#L15
const origConsoleError = globalThis.console.error;
globalThis.console.error = (...args: unknown[]) => {
  const error = args[0];
  if (isNextRouterError(error) || isAsyncClientComponentError(error)) {
    return;
  }
  origConsoleError.apply(globalThis.console, args);
};

globalThis.addEventListener('error', (ev: WindowEventMap['error']): void => {
  if (isNextRouterError(ev.error) || isAsyncClientComponentError(ev.error)) {
    ev.preventDefault();
    return;
  }
});

// Type assertion to handle the decorator type mismatch
const asDecorator = (decorator: (Story: React.FC, context?: any) => React.ReactNode) =>
  decorator as unknown as Addon_DecoratorFunction<ReactRenderer>;

export const decorators: Addon_DecoratorFunction<ReactRenderer>[] = [
  asDecorator(StyledJsxDecorator),
  asDecorator(ImageDecorator),
  asDecorator(RouterDecorator),
  asDecorator(HeadManagerDecorator),
];

export const loaders: LoaderFunction<ReactRenderer> = async ({ globals, parameters }) => {
  const { router, appDirectory } = parameters.nextjs ?? {};
  if (appDirectory) {
    createNavigation(router);
  } else {
    createRouter({
      locale: globals.locale,
      ...(router as Record<string, unknown>),
    });
  }
};

export const parameters = {
  docs: {
    source: {
      excludeDecorators: true,
    },
  },
  react: {
    rootOptions: {
      onCaughtError(error: unknown) {
        if (isNextRouterError(error)) {
          return;
        }
        console.error(error);
      },
    },
  },
};
