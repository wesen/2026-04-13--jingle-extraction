/**
 * MacWindow.tsx — Mac OS-style window chrome.
 *
 * A bordered container with a title bar (close button + title text + texture)
 * and a scrollable body area.
 */

import type { ReactNode } from 'react';
import { PARTS } from '../JingleExtractor/parts';
import './MacWindow.css';

interface MacWindowProps {
  /** Title shown in the title bar */
  title: string;
  /** Window content */
  children: ReactNode;
  /** Additional style for the root element */
  style?: React.CSSProperties;
  /** Additional style for the body */
  bodyStyle?: React.CSSProperties;
}

export function MacWindow({ title, children, style, bodyStyle }: MacWindowProps) {
  return (
    <div data-part={PARTS.window} style={style}>
      {/* Title bar */}
      <div data-part={PARTS.titleBar}>
        <div data-part={PARTS.windowButton} />
        <div data-part={PARTS.titleBarLeft} />
        <span data-part={PARTS.titleText}>{title}</span>
        <div data-part={PARTS.titleBarRight} />
      </div>

      {/* Body */}
      <div data-part={PARTS.windowBody} style={bodyStyle}>
        {children}
      </div>
    </div>
  );
}
