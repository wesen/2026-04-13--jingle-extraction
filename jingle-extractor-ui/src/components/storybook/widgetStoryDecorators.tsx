import type { CSSProperties, ReactElement } from 'react';
import { WIDGET } from '../JingleExtractor/parts';
import { MacWindow } from '../MacWindow';

interface WidgetRootDecoratorOptions {
  theme?: 'retro' | 'dark' | 'light';
  style?: CSSProperties;
}

interface WidgetWindowDecoratorOptions extends WidgetRootDecoratorOptions {
  title: string;
  bodyStyle?: CSSProperties;
}

export function withWidgetRoot({
  theme = 'retro',
  style,
}: WidgetRootDecoratorOptions = {}) {
  return (Story: () => ReactElement) => (
    <div data-widget={WIDGET} data-je-theme={theme} style={style}>
      <Story />
    </div>
  );
}

export function withWidgetWindow({
  title,
  theme = 'retro',
  style,
  bodyStyle = { padding: 8 },
}: WidgetWindowDecoratorOptions) {
  return (Story: () => ReactElement) => (
    <div data-widget={WIDGET} data-je-theme={theme} style={style}>
      <MacWindow title={title}>
        <div style={bodyStyle}>
          <Story />
        </div>
      </MacWindow>
    </div>
  );
}
