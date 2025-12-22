import Link from 'next/link';
import { FileText, Rss, FolderOpen, Tags, CheckCircle, Clock, Star } from 'lucide-react';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

function StatsCard({
  title,
  value,
  icon: Icon,
  href,
}: {
  title: string;
  value: number | string;
  icon: any;
  href?: string;
}) {
  const content = (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
        </div>
        <div className="bg-purple-600/20 p-3 rounded-lg">
          <Icon className="w-8 h-8 text-purple-500" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default async function AdminDashboard() {
  const [totalArticles, draftArticles, approvedArticles, starredArticle, totalFeeds, totalCategories, totalTags] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { status: 'DRAFT' } }),
    prisma.article.count({ where: { status: 'APPROVED' } }),
    prisma.article.findFirst({ where: { isStarred: true } }),
    prisma.rSSFeed.count(),
    prisma.category.count(),
    prisma.tag.count(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Content hub management overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Articles" value={totalArticles} icon={FileText} href="/admin/review" />
        <StatsCard title="Pending Review" value={draftArticles} icon={Clock} href="/admin/review" />
        <StatsCard title="Published" value={approvedArticles} icon={CheckCircle} />
        <StatsCard
          title="Starred Article"
          value={starredArticle ? '✓' : 'None'}
          icon={Star}
          href="/admin/review"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="RSS Feeds" value={totalFeeds} icon={Rss} href="/admin/rss-feeds" />
        <StatsCard title="Categories" value={totalCategories} icon={FolderOpen} href="/admin/categories" />
        <StatsCard title="Tags" value={totalTags} icon={Tags} href="/admin/tags" />
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/submit"
            className="flex items-center space-x-3 p-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-colors"
          >
            <FileText className="w-6 h-6 text-purple-400" />
            <div>
              <p className="font-medium text-white">Submit New Article</p>
              <p className="text-sm text-gray-400">Add article from URL</p>
            </div>
          </Link>
          <Link
            href="/admin/review"
            className="flex items-center space-x-3 p-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-colors"
          >
            <CheckCircle className="w-6 h-6 text-purple-400" />
            <div>
              <p className="font-medium text-white">Review Content</p>
              <p className="text-sm text-gray-400">Approve pending articles</p>
            </div>
          </Link>
          <Link
            href="/admin/rss-feeds"
            className="flex items-center space-x-3 p-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-colors"
          >
            <Rss className="w-6 h-6 text-purple-400" />
            <div>
              <p className="font-medium text-white">Manage RSS Feeds</p>
              <p className="text-sm text-gray-400">Add and fetch feeds</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
