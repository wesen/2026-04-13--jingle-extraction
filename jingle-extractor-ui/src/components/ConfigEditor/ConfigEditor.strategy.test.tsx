// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfigEditor } from './ConfigEditor';
import { DEFAULT_CONFIG } from '../../utils/constants';

describe('ConfigEditor strategy controls', () => {
  it('switches the candidate strategy without editing raw JSON manually', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ConfigEditor
        config={DEFAULT_CONFIG}
        onChange={onChange}
        onRun={() => {}}
        onReset={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /lyric aligned/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate_mode: 'lyric_aligned',
      })
    );
  });
});
