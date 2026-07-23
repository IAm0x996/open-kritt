import ModelConfiguration, { modelConfigurationForCatalog, modelConfigurationIsValid } from './ModelConfiguration.jsx';
import {
  enableModelOverrides,
  modelOverridesDraft,
  modelSelectionDraft,
  normalizeModelOverrides,
  resolvedModelConfiguration,
} from '../lib/modelOverrides.js';

export function workflowModelConfigurationForCatalog(current, providers, catalog) {
  const base = modelConfigurationForCatalog(current, providers, catalog);
  return {
    ...base,
    model_overrides: normalizeModelOverrides(current?.model_overrides ?? current?.modelOverrides, (configuration) =>
      modelConfigurationForCatalog(configuration, providers, catalog)
    ),
  };
}

export function workflowModelConfigurationIsValid(value, depths, providers, catalog) {
  if (!modelConfigurationIsValid(value, providers, catalog)) return false;
  const overrides = modelOverridesDraft(value?.model_overrides ?? value?.modelOverrides);
  const allowedDepths = new Set(depths.map(String));
  if (Object.keys(overrides).some((depth) => !allowedDepths.has(depth))) return false;
  return depths.every((depth) =>
    modelConfigurationIsValid(resolvedModelConfiguration(value, depth), providers, catalog)
  );
}

function modeButtonStyle(active, disabled) {
  return {
    minHeight: 34,
    padding: '0 12px',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 8,
    background: active ? 'var(--accent-subtle)' : 'var(--surface)',
    color: disabled ? 'var(--text-3)' : active ? 'var(--accent)' : 'var(--text-2)',
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

export default function WorkflowModelConfiguration({
  value,
  onChange,
  depths,
  depthChips = [],
  providers,
  catalog,
  catalogError,
  disabled = false,
}) {
  const overrides = modelOverridesDraft(value?.model_overrides ?? value?.modelOverrides);
  const customized = Object.keys(overrides).length > 0;
  const canCustomize = depths.length > 0;
  const depthLabels = new Map(depthChips.map((chip) => [chip.depth, chip]));

  const useSingleModel = () => onChange({ ...value, model_overrides: {} });
  const customizeByDepth = () =>
    onChange({
      ...value,
      model_overrides: enableModelOverrides(depths, value, overrides),
    });

  return (
    <>
      <div
        role="group"
        aria-label="Workflow model strategy"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}
      >
        <button
          type="button"
          aria-pressed={!customized}
          disabled={disabled}
          onClick={useSingleModel}
          style={modeButtonStyle(!customized, disabled)}
        >
          One model for all depths
        </button>
        <button
          type="button"
          aria-pressed={customized}
          disabled={disabled || !canCustomize}
          onClick={customizeByDepth}
          style={modeButtonStyle(customized, disabled || !canCustomize)}
        >
          Customize by depth
        </button>
      </div>

      <div
        style={{
          border: customized ? '1px solid var(--border)' : 0,
          borderRadius: 9,
          padding: customized ? 13 : 0,
          background: customized ? 'var(--surface-2)' : 'transparent',
        }}
      >
        {customized && (
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginBottom: 9 }}>
            DEFAULT &amp; POST-PROCESSING
          </div>
        )}
        <ModelConfiguration
          value={value}
          onChange={(configuration) => onChange({ ...value, ...configuration })}
          providers={providers}
          catalog={catalog}
          catalogError={catalogError}
          disabled={disabled}
        />
      </div>

      {customized && (
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {depths.map((depth) => {
            const chip = depthLabels.get(depth);
            const configuration = resolvedModelConfiguration(value, depth);
            return (
              <div
                key={depth}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 9,
                  padding: 13,
                  background: 'var(--surface)',
                }}
              >
                <div
                  className="mono"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    fontSize: 10.5,
                    color: 'var(--text-3)',
                    marginBottom: 9,
                  }}
                >
                  <span>DEPTH {depth}</span>
                  {chip?.count ? (
                    <span>
                      {chip.count} {chip.count === 1 ? 'step' : 'steps'}
                    </span>
                  ) : null}
                </div>
                <ModelConfiguration
                  value={configuration}
                  onChange={(nextConfiguration) =>
                    onChange({
                      ...value,
                      model_overrides: {
                        ...overrides,
                        [`${depth}`]: modelSelectionDraft(nextConfiguration),
                      },
                    })
                  }
                  providers={providers}
                  catalog={catalog}
                  catalogError={catalogError}
                  disabled={disabled}
                  showAvailabilityHelp={false}
                />
              </div>
            );
          })}
        </div>
      )}

      {!canCustomize && (
        <div style={{ marginTop: 8, color: 'var(--text-3)', fontSize: 11.5 }}>
          Select a workflow to configure models by depth.
        </div>
      )}
    </>
  );
}
