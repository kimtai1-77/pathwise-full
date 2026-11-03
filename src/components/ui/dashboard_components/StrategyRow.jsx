
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { StrategyScoreCard } from './StrategyScoreCard.jsx';
import { WhatsMissingCard } from './WhatsMissingCard.jsx';
import { StartFixDrawer } from '@/components/ui/drawers/StartFixDrawer.jsx';
import { calculateStrategyScore } from '@/utils/calculateStrategyScore.js';
import './styles/StrategyRow.css';

export function StrategyRow({ 
  strategyName = 'Patch Applications',
  maturityLevel,
  onScoreChange
}) {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fixControl, setFixControl] = useState(null);

  useEffect(() => {
    // Correct guard: ensure strategyName exists and maturityLevel is not undefined/null
    if (!strategyName || maturityLevel === undefined || maturityLevel === null) {
      console.warn('Fetch skipped: Missing strategyName or maturityLevel', { strategyName, maturityLevel });
      return;
    }

    let isMounted = true;

    const fetchStrategyControls = async () => {
      setLoading(true);
      
      console.log('FETCHING WITH:', { 
        strategyName, 
        maturityLevel, 
        type: typeof maturityLevel 
      });

      const { data, error } = await supabase
        .from('controls')
        .select('id, strategy, maturity_level, control_code, name, ism_id, status, is_approved, admin_note')
        .eq('strategy', strategyName)
        .eq('maturity_level', maturityLevel);

      if (error) {
        console.error(`Error fetching controls for "${strategyName}" (${maturityLevel}):`, error);
      } else if (isMounted) {
        console.log('SUPABASE RETURNED:', data);
        setControls(data || []);
      }
      
      if (isMounted) {
        setLoading(false);
      }
    };

    fetchStrategyControls();

    return () => {
      isMounted = false;
    };
  }, [strategyName, maturityLevel]);

  // Derived Metrics
  const maxControls = controls.length;
  const whatsMissing = controls.filter((control) => !control.is_approved);
  const missingItems = whatsMissing.length;
  const score = calculateStrategyScore(maxControls, missingItems) ?? 0;

  useEffect(() => {
    if (
      !loading &&
      strategyName &&
      maturityLevel !== undefined &&
      maturityLevel !== null
    ) {
      onScoreChange?.(strategyName, score, maturityLevel);
    }
  }, [loading, maturityLevel, onScoreChange, score, strategyName]);

  if (!strategyName || !maturityLevel) return null;

  // Determine compliance tier ('high', 'medium', 'low') for StrategyScoreCard
  const getComplianceStatus = () => {
    if (maxControls === 0) return 'low';
    const percentage = ((maxControls - missingItems) / maxControls) * 100;
    if (percentage > 80) return 'high';
    if (percentage < 40) return 'low';
    else return 'medium';
  };

  const complianceStatus = getComplianceStatus();

  return (
    <article className="strategy-row-cont">
      <StrategyScoreCard
        maturityLevel={maturityLevel}
        strategyName={strategyName}
        complianceStatus={complianceStatus}
        maxControls={maxControls}
        missingItems={missingItems}
      />
      <WhatsMissingCard
        whatsMissing={whatsMissing}
        loading={loading}
        onOpenFixDrawer={setFixControl}
      />
      <StartFixDrawer
        control={fixControl}
        onClose={() => setFixControl(null)}
      />
    </article>
  );
}