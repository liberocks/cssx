import { describe, expect, it } from 'vitest';
import { compileUtilities } from '../src/index';

describe('CSSX utility compiler', () => {
  it('compiles default utilities and rewrites only their root selectors', async () => {
    const result = await compileUtilities(
      ['p-5', 'hover:bg-red-500', 'sm:grid-cols-3'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('.x-p-5');
    expect(result.css).toContain('.x-hover-bg-red-500:hover');
    expect(result.css).toContain('@media (width >= 40rem)');
    expect(result.css).not.toContain('.p-5');
    expect(result.css).toContain('padding:calc(0.25rem * 5)');
  });

  it('emits identical generated rules only once', async () => {
    const result = await compileUtilities(['block', '[display:block]'], () => 'x-display');

    expect(result.entries).toHaveLength(1);
    expect(result.css.match(/\.x-display\{display:block;\}/g)).toHaveLength(1);
  });

  it('compiles display table, flow-root, contents, and list-item primitives', async () => {
    const result = await compileUtilities(
      ['flow-root', 'contents', 'table', 'inline-table', 'table-header-group', 'table-row', 'table-cell', 'list-item'],
      (candidate) => `x-${candidate}`,
    );
    expect(result.css).toContain('.x-flow-root{display:flow-root;}');
    expect(result.css).toContain('.x-contents{display:contents;}');
    expect(result.css).toContain('.x-table-header-group{display:table-header-group;}');
    expect(result.css).toContain('.x-table-cell{display:table-cell;}');
  });

  it('compiles columns, breaks, float/clear, object position, sizing, and box-decoration layout utilities', async () => {
    const result = await compileUtilities(
      [
        'columns-3',
        'columns-[18rem]',
        'break-before-column',
        'break-inside-avoid',
        'float-start',
        'clear-both',
        'box-border',
        'box-decoration-clone',
        'object-top-right',
        'object-[25%_75%]',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );
    expect(result.css).toContain('columns:3');
    expect(result.css).toContain('columns:18rem');
    expect(result.css).toContain('break-before:column');
    expect(result.css).toContain('break-inside:avoid');
    expect(result.css).toContain('float:inline-start');
    expect(result.css).toContain('clear:both');
    expect(result.css).toContain('box-sizing:border-box');
    expect(result.css).toContain('-webkit-box-decoration-break:clone;box-decoration-break:clone');
    expect(result.css).toContain('object-position:top right');
    expect(result.css).toContain('object-position:25% 75%');
  });

  it('accepts only the documented pagination-break variants', async () => {
    const result = await compileUtilities(
      ['break-before-left', 'break-after-avoid-page', 'break-inside-avoid-column'],
      (candidate) => `x-${candidate}`,
    );

    expect(result.css).toContain('break-before:left');
    expect(result.css).toContain('break-after:avoid-page');
    expect(result.css).toContain('break-inside:avoid-column');
    await expect(compileUtilities(['break-inside-page'], () => 'x-invalid')).rejects.toThrow('cannot compile utility');
    await expect(compileUtilities(['break-before-avoid-column'], () => 'x-invalid')).rejects.toThrow(
      'cannot compile utility',
    );
  });

  it('compiles text overflow, wrapping, hyphens, tab, list, and line-clamp typography utilities', async () => {
    const result = await compileUtilities(
      [
        'truncate',
        'text-clip',
        'hyphens-auto',
        'whitespace-pre-wrap',
        'text-balance',
        'wrap-break-word',
        'tab-8',
        'list-disc',
        'list-image-[url("/marker.svg")]',
        'line-clamp-3',
        'line-clamp-none',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );
    expect(result.css).toContain('text-overflow:ellipsis');
    expect(result.css).toContain('text-overflow:clip');
    expect(result.css).toContain('-webkit-hyphens:auto;hyphens:auto');
    expect(result.css).toContain('white-space:pre-wrap');
    expect(result.css).toContain('text-wrap:balance');
    expect(result.css).toContain('overflow-wrap:break-word');
    expect(result.css).toContain('tab-size:8');
    expect(result.css).toContain('list-style-type:disc');
    expect(result.css).toContain('list-style-image:url("/marker.svg")');
    expect(result.css).toContain('-webkit-line-clamp:3');
    expect(result.css).toContain('-webkit-line-clamp:unset');
  });

  it('compiles sr-only and not-sr-only accessibility display resets', async () => {
    const result = await compileUtilities(['sr-only', 'not-sr-only'], (candidate) => `x-${candidate}`);
    expect(result.css).toContain(
      '.x-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border-width:0;}',
    );
    expect(result.css).toContain(
      '.x-not-sr-only{position:static;width:auto;height:auto;padding:0;margin:0;overflow:visible;clip-path:none;white-space:normal;}',
    );
  });

  it('applies supported condition and attribute variants without preserving source utility selectors', async () => {
    const result = await compileUtilities(
      [
        'dark:text-white',
        'print:hidden',
        'data-[state=open]:bg-red-500',
        'aria-disabled:opacity-50',
        'supports-[display:grid]:grid',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('@media (prefers-color-scheme: dark)');
    expect(result.css).toContain('@media print');
    expect(result.css).toContain('[data-state=open]');
    expect(result.css).toContain('[aria-disabled="true"]');
    expect(result.css).toContain('@supports (display: grid)');
    expect(result.css).not.toContain('.data-\\[state');
  });

  it('compiles group, peer, has, and not structural variants with their native selector relationships', async () => {
    const result = await compileUtilities(
      [
        'group-hover:bg-red-500',
        'peer-checked:text-white',
        'has-[input:checked]:border-blue-600',
        'not-hover:opacity-50',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('.group:hover .x-group-hover-bg-red-500');
    expect(result.css).toContain('.peer:checked ~ .x-peer-checked-text-white');
    expect(result.css).toContain('.x-has--input-checked--border-blue-600:has(input:checked)');
    expect(result.css).toContain('.x-not-hover-opacity-50:not(*:hover)');
  });

  it('compiles direct, group, and peer custom-element state variants', async () => {
    const result = await compileUtilities(
      ['state-[open]:shadow-xl', 'group-state-[open]:text-white', 'peer-state-[selected]:opacity-100'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('.x-state--open--shadow-xl:state(open)');
    expect(result.css).toContain('.group:state(open) .x-group-state--open--text-white');
