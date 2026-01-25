import { describe, expect, it } from 'vitest';

describe('Test Setup', () => {
  it('vitest is configured correctly', () => {
    expect(true).toBe(true);
  });

  it('can use jest-dom matchers', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello';
    document.body.appendChild(element);

    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello');

    document.body.removeChild(element);
  });
});
