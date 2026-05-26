import { createFileRoute } from '@tanstack/react-router';
import { Fragment, useState } from 'react';
import { PageHeader, PageHeaderTitle, PageHeaderDescription, Button, Badge, Input } from '@repo/ui';
import { Pencil, GitBranch, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '~/lib/store';

export const Route = createFileRoute('/_dashboard/admin/registry')({
  component: RegistryPage,
});

function RegistryPage() {
  const registry = useStore((s) => s.lineItemRegistry);
  const editName = useStore((s) => s.editRegistryItemName);
  const separate = useStore((s) => s.separateRegistryAlias);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = registry.items.filter(
    (item) =>
      item.canonicalName.toLowerCase().includes(search.toLowerCase()) ||
      item.costType.toLowerCase().includes(search.toLowerCase()) ||
      item.aliases.some((a) => a.raw.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader>
        <div>
          <PageHeaderTitle>Line Item Registry</PageHeaderTitle>
          <PageHeaderDescription>
            Canonical line items across all projects. Merge duplicates, separate mistakes, manage
            aliases.
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search items, cost types, or aliases…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium w-8"></th>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Cost Type</th>
              <th className="px-4 py-2 text-left font-medium">UoM</th>
              <th className="px-4 py-2 text-left font-medium">Aliases</th>
              <th className="px-4 py-2 text-left font-medium">Projects</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <Fragment key={item.id}>
                <tr className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2">
                    {item.aliases.length > 0 && (
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {expandedId === item.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium">{item.canonicalName}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline">{item.costType}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{item.unitOfMeasure}</td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary">{item.aliases.length}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{item.projectIds.length}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const name = prompt('New name:', item.canonicalName);
                        if (name) editName(item.id, name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
                {expandedId === item.id &&
                  item.aliases.map((alias) => (
                    <tr key={`${item.id}-${alias.raw}`} className="bg-muted/10 border-b">
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5 pl-10 text-muted-foreground italic">
                        {alias.raw}
                      </td>
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5 text-xs text-muted-foreground">
                        from {alias.sourceProjectId}
                      </td>
                      <td className="px-4 py-1.5"></td>
                      <td className="px-4 py-1.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => separate(item.id, alias.raw)}
                          title="Separate into independent item"
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No line items yet. Items are added automatically when projections are uploaded.
          </div>
        )}
      </div>
    </div>
  );
}
