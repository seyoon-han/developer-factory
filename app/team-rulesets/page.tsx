'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { TeamRulesetList } from '@/components/TeamRulesetList';

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

export default function TeamRulesetsPage() {
  const [rulesets, setRulesets] = useState<TeamRuleset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchRulesets();
  }, []);

  const fetchRulesets = async () => {
    try {
      const response = await fetch('/api/team-rulesets');
      if (response.ok) {
        const data = await response.json();
        setRulesets(data);
      }
    } catch (error) {
      console.error('Error fetching rulesets:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Rulesets</h1>
          <p className="text-muted-foreground mt-1">
            Manage team workflow best practices and guidelines
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Ruleset
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-2 text-muted-foreground">Loading rulesets...</p>
        </div>
      ) : (
        <TeamRulesetList
          rulesets={rulesets}
          onRefresh={fetchRulesets}
          showCreateModal={showCreateModal}
          onCloseCreateModal={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

