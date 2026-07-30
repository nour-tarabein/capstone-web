import { useMemo, useState } from 'react';
import { mdiCheck, mdiChevronDown, mdiStar, mdiSwapVertical } from '@mdi/js';
import { ScreenHeader } from '../components/ScreenHeader';
import { exhibitors, type Exhibitor } from '../data/mock';
import { initials } from '../offsite/format';
import { openOverlay } from '../overlays';
import { isFavorite, useFavoriteVersion } from '../sheets/ExhibitorSheet';
import { Icon } from '../icons';
import { colors } from '../theme';
import { LiquidButton } from '../components/LiquidButton';

const tabs = ['Categories', 'List'] as const;
const SPONSORSHIPS = ['Platinum', 'Gold', 'Silver'];
const TIERS = [...SPONSORSHIPS, 'Community'];

type MenuKind = 'sponsorship' | 'section' | null;

export function ExhibitorsScreen() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('List');
  const [sponsorship, setSponsorship] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'booth'>('name');
  const [menu, setMenu] = useState<MenuKind>(null);
  useFavoriteVersion();

  const allSections = useMemo(
    () => Array.from(new Set(exhibitors.map((e) => e.section))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    let list = exhibitors.filter(
      (e) =>
        (sponsorship === null || e.sponsorship === sponsorship) &&
        (section === null || e.section === section),
    );
    list = [...list].sort((a, b) =>
      sortBy === 'name'
        ? a.name.localeCompare(b.name)
        : a.booth.localeCompare(b.booth),
    );
    return list;
  }, [sponsorship, section, sortBy]);

  const sections = useMemo(() => {
    const map = new Map<string, Exhibitor[]>();
    for (const item of filtered) {
      const key = sortBy === 'name' ? item.section : item.booth[0];
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [filtered, sortBy]);

  function filterMenu(kind: Exclude<MenuKind, null>) {
    const options = kind === 'sponsorship' ? SPONSORSHIPS : allSections;
    const current = kind === 'sponsorship' ? sponsorship : section;
    const set = kind === 'sponsorship' ? setSponsorship : setSection;
    return (
      <div className="popover" role="menu">
        {[null, ...options].map((option) => (
          <LiquidButton
            key={option ?? 'all'}
            className="popover-item"
            role="menuitem"
            onClick={() => {
              set(option);
              setMenu(null);
            }}
          >
            <span>{option ?? 'All'}</span>
            {current === option ? (
              <Icon path={mdiCheck} size={16} color={colors.green} />
            ) : null}
          </LiquidButton>
        ))}
      </div>
    );
  }

  function row(item: Exhibitor, label: string) {
    return (
      <LiquidButton
        key={item.id}
        className="exhibitor-row glass-card"
        onClick={() => openOverlay({ kind: 'exhibitor', exhibitorId: item.id })}
      >
        <span className="exhibitor-index">{label}</span>
        <span className="exhibitor-logo">{initials(item.name)}</span>
        <span className="exhibitor-body">
          <span className="exhibitor-name">
            {item.name}
            {isFavorite(item.id) ? (
              <Icon path={mdiStar} size={14} color="#E8A800" />
            ) : null}
          </span>
          <span className="exhibitor-meta">{item.booth}</span>
          {item.sponsorship ? (
            <span className="exhibitor-meta">{item.sponsorship}</span>
          ) : null}
        </span>
      </LiquidButton>
    );
  }

  return (
    <div className="screen screen-light">
      <ScreenHeader title="Exhibitors" showSearch />

      <div className="top-tabs top-tabs-light">
        {tabs.map((tab) => (
          <LiquidButton
            key={tab}
            className={
              tab === activeTab
                ? 'top-tab top-tab-light top-tab-light-active'
                : 'top-tab top-tab-light'
            }
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </LiquidButton>
        ))}
      </div>

      {activeTab === 'List' ? (
        <>
          <div className="filters-row">
            <div className="filter-anchor">
              <LiquidButton
                className={sponsorship ? 'filter-chip filter-chip-set' : 'filter-chip'}
                aria-expanded={menu === 'sponsorship'}
                onClick={() => setMenu(menu === 'sponsorship' ? null : 'sponsorship')}
              >
                {sponsorship ?? 'Sponsorship level'}
                <Icon path={mdiChevronDown} size={14} color="currentColor" />
              </LiquidButton>
              {menu === 'sponsorship' ? filterMenu('sponsorship') : null}
            </div>
            <div className="filter-anchor">
              <LiquidButton
                className={section ? 'filter-chip filter-chip-set' : 'filter-chip'}
                aria-expanded={menu === 'section'}
                onClick={() => setMenu(menu === 'section' ? null : 'section')}
              >
                {section ? `Section ${section}` : 'Booth section'}
                <Icon path={mdiChevronDown} size={14} color="currentColor" />
              </LiquidButton>
              {menu === 'section' ? filterMenu('section') : null}
            </div>
          </div>

          <div className="sort-row">
            <LiquidButton
              className="sort-button"
              onClick={() => setSortBy(sortBy === 'name' ? 'booth' : 'name')}
            >
              <Icon path={mdiSwapVertical} size={15} color="currentColor" />
              Sorted by {sortBy}
            </LiquidButton>
          </div>

          <div className="screen-scroll" onClick={() => menu && setMenu(null)}>
            {filtered.length === 0 ? (
              <p className="empty-text empty-text-dark">
                No exhibitors match those filters.
              </p>
            ) : (
              sections.map((group) => (
                <div key={group.title}>
                  {group.data.map((item, index) => (
                    <div key={item.id}>
                      {row(item, index === 0 ? group.title : '')}
                      <div className="exhibitor-separator" />
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="screen-scroll category-grid-wrap">
          {TIERS.map((tier) => {
            const list = exhibitors.filter((e) =>
              tier === 'Community' ? !e.sponsorship : e.sponsorship === tier,
            );
            if (list.length === 0) return null;
            return (
              <div key={tier} className="tier-block">
                <div className="tier-title">{tier}</div>
                <div className="tier-grid">
                  {list.map((e) => (
                    <LiquidButton
                      key={e.id}
                      className="tier-card glass-card"
                      onClick={() =>
                        openOverlay({ kind: 'exhibitor', exhibitorId: e.id })
                      }
                    >
                      <span className="exhibitor-logo">{initials(e.name)}</span>
                      <span className="tier-card-name">{e.name}</span>
                      <span className="exhibitor-meta">Booth {e.booth}</span>
                    </LiquidButton>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
