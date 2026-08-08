import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { StepPanel } from './WorkflowDetail.jsx';
import { REQUIRED_VULN_KEYS } from '../lib/keys.js';

// A minimal terminal step: isLast triggers the "emits all N required vulnerability
// keys" summary. depth 0 with an empty steps array keeps availableKeysForDepth happy.
const terminalStep = {
  depth: 0,
  name: 'Report',
  content: '',
  multiOutput: false,
  consumesAll: false,
  outputTable: 'workflows.vulnerabilities',
  outputFormat: {},
  isLast: true,
};

describe('WorkflowDetail terminal step summary', () => {
  it('reports the real number of required vulnerability keys, not a hardcoded value', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <StepPanel step={terminalStep} steps={[terminalStep]} editTo="/workflows/1/steps/1" onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(html).toContain(`emits all ${REQUIRED_VULN_KEYS.length} required vulnerability keys`);
    // Guard against the regression this test covers: the count was hardcoded to 9
    // while REQUIRED_VULN_KEYS actually has 8 entries.
    expect(html).not.toContain('emits all 9 required vulnerability keys');
  });
});
