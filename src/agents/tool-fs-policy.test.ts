import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  createToolFsPolicy,
  resolveEffectiveToolFsRootExpansionAllowed,
  resolveEffectiveToolFsWorkspaceOnly,
  resolveToolFsConfig,
} from "./tool-fs-policy.js";

describe("resolveEffectiveToolFsWorkspaceOnly", () => {
  it("returns false by default when tools.fs.workspaceOnly is unset", () => {
    expect(resolveEffectiveToolFsWorkspaceOnly({ cfg: {}, agentId: "main" })).toBe(false);
  });

  it("uses global tools.fs.workspaceOnly when no agent override exists", () => {
    const cfg: OpenClawConfig = {
      tools: { fs: { workspaceOnly: true } },
    };
    expect(resolveEffectiveToolFsWorkspaceOnly({ cfg, agentId: "main" })).toBe(true);
  });

  it("prefers agent-specific tools.fs.workspaceOnly override over global setting", () => {
    const cfg: OpenClawConfig = {
      tools: { fs: { workspaceOnly: true } },
      agents: {
        list: [
          {
            id: "main",
            tools: {
              fs: { workspaceOnly: false },
            },
          },
        ],
      },
    };
    expect(resolveEffectiveToolFsWorkspaceOnly({ cfg, agentId: "main" })).toBe(false);
  });

  it("supports agent-specific enablement when global workspaceOnly is off", () => {
    const cfg: OpenClawConfig = {
      tools: { fs: { workspaceOnly: false } },
      agents: {
        list: [
          {
            id: "main",
            tools: {
              fs: { workspaceOnly: true },
            },
          },
        ],
      },
    };
    expect(resolveEffectiveToolFsWorkspaceOnly({ cfg, agentId: "main" })).toBe(true);
  });
});

describe("resolveEffectiveToolFsRootExpansionAllowed", () => {
  it("allows root expansion by default when no restrictive profile is configured", () => {
    expect(resolveEffectiveToolFsRootExpansionAllowed({ cfg: {}, agentId: "main" })).toBe(true);
  });

  it("disables root expansion for messaging profile agents without filesystem opt-in", () => {
    const cfg: OpenClawConfig = {
      tools: { profile: "messaging" },
    };
    expect(resolveEffectiveToolFsRootExpansionAllowed({ cfg, agentId: "main" })).toBe(false);
  });

  it("re-enables root expansion when tools.fs explicitly allows non-workspace reads", () => {
    const cfg: OpenClawConfig = {
      tools: {
        profile: "messaging",
        fs: { workspaceOnly: false },
      },
    };
    expect(resolveEffectiveToolFsRootExpansionAllowed({ cfg, agentId: "main" })).toBe(true);
  });

  it("treats an explicit tools.fs block as a filesystem opt-in", () => {
    const cfg: OpenClawConfig = {
      tools: {
        profile: "messaging",
        fs: {},
      },
    };
    expect(resolveEffectiveToolFsRootExpansionAllowed({ cfg, agentId: "main" })).toBe(true);
  });

  it("keeps root expansion disabled when tools.fs only restricts access to the workspace", () => {
    const cfg: OpenClawConfig = {
      tools: {
        profile: "messaging",
        fs: { workspaceOnly: true },
      },
    };
    expect(resolveEffectiveToolFsRootExpansionAllowed({ cfg, agentId: "main" })).toBe(false);
  });

  it("prefers agent profile overrides over the global profile in both directions", () => {
    const cfg: OpenClawConfig = {
      tools: { profile: "messaging" },
      agents: {
        list: [
          { id: "coder", tools: { profile: "coding" } },
          { id: "messenger", tools: { profile: "messaging" } },
        ],
      },
    };

    expect(resolveEffectiveToolFsRootExpansionAllowed({ cfg, agentId: "coder" })).toBe(true);

    const invertedCfg: OpenClawConfig = {
      tools: { profile: "coding" },
      agents: {
        list: [{ id: "messenger", tools: { profile: "messaging" } }],
      },
    };

    expect(
      resolveEffectiveToolFsRootExpansionAllowed({ cfg: invertedCfg, agentId: "messenger" }),
    ).toBe(false);
  });

  it("uses agent alsoAllow in place of global alsoAllow when resolving expansion", () => {
    const cfg: OpenClawConfig = {
      tools: {
        profile: "messaging",
        alsoAllow: ["read"],
      },
      agents: {
        list: [
          {
            id: "messenger",
            tools: {
              alsoAllow: ["message"],
            },
          },
        ],
      },
    };

    expect(resolveEffectiveToolFsRootExpansionAllowed({ cfg, agentId: "messenger" })).toBe(false);
  });

  it("honors agent workspaceOnly overrides over global fs opt-in", () => {
    const cfg: OpenClawConfig = {
      tools: {
        profile: "messaging",
        fs: { workspaceOnly: false },
      },
      agents: {
        list: [
          {
            id: "messenger",
            tools: {
              fs: { workspaceOnly: true },
            },
          },
        ],
      },
    };

    expect(resolveEffectiveToolFsRootExpansionAllowed({ cfg, agentId: "messenger" })).toBe(false);
  });

  it("does not disable root expansion when only workdirWriteOnly is set", () => {
    const cfg: OpenClawConfig = {
      tools: {
        fs: { workdirWriteOnly: true },
      },
    };
    // workdirWriteOnly restricts writes only — root expansion (a read concern) stays allowed.
    expect(resolveEffectiveToolFsRootExpansionAllowed({ cfg, agentId: "main" })).toBe(true);
  });
});

describe("resolveToolFsConfig – workdirWriteOnly", () => {
  it("returns undefined for workdirWriteOnly when not configured", () => {
    expect(resolveToolFsConfig({ cfg: {}, agentId: "main" }).workdirWriteOnly).toBeUndefined();
  });

  it("uses global tools.fs.workdirWriteOnly when no agent override exists", () => {
    const cfg: OpenClawConfig = {
      tools: { fs: { workdirWriteOnly: true } },
    };
    expect(resolveToolFsConfig({ cfg, agentId: "main" }).workdirWriteOnly).toBe(true);
  });

  it("prefers agent-specific tools.fs.workdirWriteOnly over global setting", () => {
    const cfg: OpenClawConfig = {
      tools: { fs: { workdirWriteOnly: true } },
      agents: {
        list: [
          {
            id: "main",
            tools: { fs: { workdirWriteOnly: false } },
          },
        ],
      },
    };
    expect(resolveToolFsConfig({ cfg, agentId: "main" }).workdirWriteOnly).toBe(false);
  });

  it("supports agent-specific workdirWriteOnly when global is off", () => {
    const cfg: OpenClawConfig = {
      tools: { fs: { workdirWriteOnly: false } },
      agents: {
        list: [
          {
            id: "worker",
            tools: { fs: { workdirWriteOnly: true } },
          },
        ],
      },
    };
    expect(resolveToolFsConfig({ cfg, agentId: "worker" }).workdirWriteOnly).toBe(true);
  });
});

describe("createToolFsPolicy – workdirWriteOnly", () => {
  it("defaults workdirWriteOnly to false when not provided", () => {
    const policy = createToolFsPolicy({});
    expect(policy.workdirWriteOnly).toBe(false);
    expect(policy.workspaceOnly).toBe(false);
  });

  it("sets workdirWriteOnly when explicitly provided", () => {
    const policy = createToolFsPolicy({ workdirWriteOnly: true });
    expect(policy.workdirWriteOnly).toBe(true);
  });

  it("allows both workspaceOnly and workdirWriteOnly to be set independently", () => {
    const policy = createToolFsPolicy({ workspaceOnly: true, workdirWriteOnly: true });
    expect(policy.workspaceOnly).toBe(true);
    expect(policy.workdirWriteOnly).toBe(true);
  });
});
