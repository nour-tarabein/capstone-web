import { useMemo, useState } from 'react';
import { mdiChevronDown } from '@mdi/js';
import { ScreenHeader } from '../components/ScreenHeader';
import { exhibitorFilters, exhibitors } from '../data/mock';
import { initials } from '../offsite/format';
import { Icon } from '../icons';
import { colors } from '../theme';

const tabs = ['Categories', 'List'] as const;

export function ExhibitorsScreen() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('List');

  const sections = useMemo(() => {
    const map = new Map<string, typeof exhibitors>();
    for (const item of exhibitors) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, []);

  return (
    <div className="screen screen-light">
      <ScreenHeader title="Exhibitors" showSearch />

      <div className="top-tabs top-tabs-light">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={
              tab === activeTab
                ? 'top-tab top-tab-light top-tab-light-active'
                : 'top-tab top-tab-light'
            }
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === activeTab ? <span className="top-tab-underline-dark" /> : null}
          </button>
        ))}
      </div>

      <div className="filters-row">
        {exhibitorFilters.map((filter) => (
          <button key={filter} className="filter-chip">
            {filter}
            <Icon path={mdiChevronDown} size={14} color={colors.textDark} />
          </button>
        ))}
      </div>

      <div className="sort-row">
        <button className="sort-button">
          Sorted by name
          <Icon path={mdiChevronDown} size={14} color={colors.textMutedDark} />
        </button>
      </div>

      <div className="screen-scroll">
        {sections.map((section) => (
          <div key={section.title}>
            {section.data.map((item, index) => (
              <div key={item.id}>
                <div className="exhibitor-row">
                  <span className="exhibitor-index">
                    {index === 0 ? section.title : ''}
                  </span>
                  <span className="exhibitor-logo">{initials(item.name)}</span>
                  <span className="exhibitor-body">
                    <span className="exhibitor-name">{item.name}</span>
                    <span className="exhibitor-meta">{item.booth}</span>
                    {item.sponsorship ? (
                      <span className="exhibitor-meta">{item.sponsorship}</span>
                    ) : null}
                  </span>
                </div>
                <div className="exhibitor-separator" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
