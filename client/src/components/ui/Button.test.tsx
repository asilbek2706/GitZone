import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('matnni ko‘rsatadi', () => {
    render(<Button>Saqlash</Button>);
    expect(screen.getByRole('button', { name: 'Saqlash' })).toBeEnabled();
  });

  it('yuklanayotganda o‘chiriladi', () => {
    render(<Button loading>Saqlash</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
