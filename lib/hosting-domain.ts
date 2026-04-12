import type { Domain, Hosting } from '@/lib/types';

/**
 * Resolves which domain to show for a hosting row/card.
 * Order: stored `hosting.domainId` → single domain for client → fallback label.
 */
export function resolveHostingPrimaryDomain(hosting: Hosting, allDomains: Domain[]): {
  domain: Domain | null;
  display: string;
  detailHref: string;
  listHref: string;
} {
  const clientDomains = allDomains.filter((d) => d.clientId === hosting.clientId);
  let d: Domain | undefined;

  if (hosting.domainId) {
    const byId = allDomains.find((x) => x.id === hosting.domainId);
    if (byId && byId.clientId === hosting.clientId) d = byId;
  }
  if (!d && clientDomains.length === 1) {
    d = clientDomains[0];
  }

  const listHref = '/dashboard/domains';

  if (d) {
    return {
      domain: d,
      display: `${d.name}${d.tld}`,
      detailHref: `/dashboard/domains/${d.id}`,
      listHref,
    };
  }

  if (clientDomains.length > 1) {
    return {
      domain: null,
      display: `${clientDomains.length} domains — link in Edit`,
      detailHref: listHref,
      listHref,
    };
  }

  return {
    domain: null,
    display: 'No domain',
    detailHref: listHref,
    listHref,
  };
}
