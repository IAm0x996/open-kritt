import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { configuredModelCatalog } from '../lib/modelProviders.js';
import ModelConfiguration, { modelConfigurationForCatalog, modelConfigurationIsValid } from './ModelConfiguration.jsx';

const providers = ['codex', 'claude', 'openrouter'];
const catalog = configuredModelCatalog({
  providers: [
    {
      provider: 'codex',
      input: 'select',
      status: 'ready',
      models: [
        {
          id: 'gpt-5-codex',
          label: 'GPT-5 Codex',
          note: 'This model may have cybersecurity usage restrictions.',
          noteUrl: 'https://chatgpt.com/cyber',
          thinkingEfforts: ['medium', 'high'],
        },
      ],
    },
    {
      provider: 'claude',
      input: 'select',
      status: 'ready',
      models: [{ id: 'claude-sonnet-4', thinkingEfforts: ['medium'] }],
    },
    { provider: 'openrouter', input: 'text', status: 'ready', models: [] },
  ],
});

describe('modelConfigurationIsValid', () => {
  it('defaults to Codex, then Claude, then OpenRouter', () => {
    expect(modelConfigurationForCatalog({}, ['openrouter', 'claude', 'codex'], catalog).model_provider).toBe('codex');
    expect(modelConfigurationForCatalog({}, ['openrouter', 'claude'], catalog).model_provider).toBe('claude');
    expect(modelConfigurationForCatalog({}, ['openrouter'], catalog).model_provider).toBe('openrouter');
  });

  it('accepts a catalog model with its compatible harness', () => {
    expect(
      modelConfigurationIsValid(
        {
          model_provider: 'codex',
          model: 'gpt-5-codex',
          thinking_effort: 'high',
          harness: 'codex',
        },
        providers,
        catalog
      )
    ).toBe(true);
  });

  it('keeps unavailable providers visible, disabled, and linked to Accounts', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(ModelConfiguration, {
          value: {
            model_provider: 'codex',
            model: 'gpt-5-codex',
            thinking_effort: 'medium',
            harness: 'codex',
          },
          onChange: () => {},
          providers: ['codex'],
          catalog,
        })
      )
    );

    expect(markup).toContain('<option value="claude" disabled="">Claude — add in Accounts</option>');
    expect(markup).toContain('<option value="openrouter" disabled="">OpenRouter — add in Accounts</option>');
    expect(markup).toContain('href="/accounts"');
  });

  it('normalizes a stale provider to a configured provider that can be saved', () => {
    const normalized = modelConfigurationForCatalog(
      {
        model_provider: 'openrouter',
        model: 'retired/model',
        thinking_effort: 'xhigh',
        harness: 'claude-code',
      },
      ['codex'],
      catalog
    );

    expect(normalized).toEqual({
      model_provider: 'codex',
      model: 'gpt-5-codex',
      thinking_effort: 'medium',
      harness: 'codex',
    });
    expect(modelConfigurationIsValid(normalized, ['codex'], catalog)).toBe(true);
  });

  it('rejects incompatible harnesses and unlisted native model IDs', () => {
    expect(
      modelConfigurationIsValid(
        {
          model_provider: 'codex',
          model: 'gpt-5-codex',
          thinking_effort: 'medium',
          harness: 'claude-code',
        },
        providers,
        catalog
      )
    ).toBe(false);
    expect(
      modelConfigurationIsValid(
        {
          model_provider: 'codex',
          model: 'unlisted-model',
          thinking_effort: 'medium',
          harness: 'codex',
        },
        providers,
        catalog
      )
    ).toBe(false);
  });

  it('renders a searchable catalog selector for native providers and free text for OpenRouter', () => {
    const renderConfiguration = (value) =>
      renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/'] },
          React.createElement(ModelConfiguration, { value, onChange: () => {}, providers, catalog })
        )
      );
    const codexMarkup = renderConfiguration({
      model_provider: 'codex',
      model: 'gpt-5-codex',
      thinking_effort: 'medium',
      harness: 'codex',
    });
    const openRouterMarkup = renderConfiguration({
      model_provider: 'openrouter',
      model: 'vendor/model',
      thinking_effort: 'medium',
      harness: 'claude-code',
    });

    expect(codexMarkup).toContain('data-model-input-mode="select"');
    expect(codexMarkup).toContain('aria-haspopup="listbox"');
    expect(codexMarkup).toContain('GPT-5 Codex');
    expect(codexMarkup).toContain('MODEL NOTE');
    expect(codexMarkup).toContain('This model may have cybersecurity usage restrictions.');
    expect(codexMarkup).not.toContain('GPT-5 Codex — This model may have cybersecurity usage restrictions.');
    expect(codexMarkup).toContain('href="https://chatgpt.com/cyber"');
    expect(codexMarkup).toContain('Learn more in ChatGPT Cyber');
    expect(codexMarkup).toContain('<option value="medium" selected="">medium</option>');
    expect(codexMarkup).toContain('<option value="high">high</option>');
    expect(codexMarkup).not.toContain('<option value="low">low</option>');
    expect(openRouterMarkup).toContain('data-model-input-mode="text"');
    expect(openRouterMarkup).toContain('value="vendor/model"');
  });
});
