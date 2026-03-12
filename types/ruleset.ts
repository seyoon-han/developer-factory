/**
 * Team Ruleset Type Definitions
 */

export interface TeamRuleset {
  id: number;
  name: string;
  description: string | null;
  version: string;
  body: string;
  when_apply: string | null;
  resources: string[];
  dependencies: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamRulesetInput {
  name: string;
  description?: string;
  version?: string;
  body: string;
  whenApply?: string;
  resources?: string[];
  dependencies?: string[];
}

export interface UpdateTeamRulesetInput extends CreateTeamRulesetInput {
  id: number;
}

export const RULESET_TEMPLATE = `## Metadata
Ruleset Name: 
Description: 
Version: 1.0.0

## Overview
[Describe the purpose and scope of this ruleset]

## When to Apply
[Describe when and where this ruleset should be applied]

## Resources
- [Resource 1]
- [Resource 2]`;

