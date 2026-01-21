'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  Download,
  Loader2,
  TrendingUp,
  Building2,
  CreditCard,
  Wallet,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  AlertTriangle,
  Send,
  CheckCircle,
  History,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

interface FinancialSummary {
  period: {
    start: string;
    end: string;
  };
  summary: {
    grossVolume: number;
    platformFees: number;
    deliveryFees: number;
    netPayable: number;
    totalOrders: number;
    paidOrders: number;
    pendingPayments: number;
    currency: string;
  };
  pharmacyBreakdown: Array<{
    pharmacyId: string;
    pharmacyName: string;
    orderCount: number;
    grossVolume: number;
    platformFees: number;
    netPayable: number;
  }>;
}

interface Settlement {
  pharmacyId: string;
  pharmacyName: string;
  date: string;
  orderCount: number;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: string;
}

interface PendingPayout {
  pharmacyId: string;
  pharmacyName: string;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  accountVerified: boolean;
  orderCount: number;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
}

interface PayoutHistory {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  amount: number;
  currency: string;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  status: string;
  initiatedAt: string;
  initiatedBy: string;
  notes: string | null;
}

function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default',
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: 'text-muted-foreground',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variantStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variantStyles[variant]}`}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminFinancialsPage() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPayout, setSelectedPayout] = useState<PendingPayout | null>(null);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutNotes, setPayoutNotes] = useState('');

  const { data: summary, isLoading: summaryLoading, refetch, isFetching } = useQuery<FinancialSummary>({
    queryKey: ['admin', 'financials', 'summary', { startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(`/admin/financials/summary?${params.toString()}`);
      return response.data?.data || response.data;
    },
  });

  const { data: settlementsData, isLoading: settlementsLoading } = useQuery<{ settlements: Settlement[] }>({
    queryKey: ['admin', 'financials', 'settlements'],
    queryFn: async () => {
      const response = await api.get('/admin/financials/settlements?limit=50');
      return response.data?.data || response.data;
    },
  });

  const { data: pendingPayoutsData, isLoading: payoutsLoading } = useQuery<{
    payouts: PendingPayout[];
    summary: { totalPharmacies: number; totalPendingAmount: number; currency: string };
  }>({
    queryKey: ['admin', 'financials', 'payouts', 'pending'],
    queryFn: async () => {
      const response = await api.get('/admin/financials/payouts/pending');
      return response.data?.data || response.data;
    },
  });

  const { data: payoutHistoryData, isLoading: historyLoading } = useQuery<{
    payouts: PayoutHistory[];
  }>({
    queryKey: ['admin', 'financials', 'payouts', 'history'],
    queryFn: async () => {
      const response = await api.get('/admin/financials/payouts/history?limit=20');
      return response.data?.data || response.data;
    },
  });

  // Wallet overview query
  const { data: walletData, isLoading: walletLoading } = useQuery<{
    overview: {
      totalBalance: number;
      walletCount: number;
      averageBalance: number;
      maxBalance: number;
      currency: string;
    };
    thisWeek: {
      transactions: number;
      deposits: { count: number; amount: number };
      withdrawals: { count: number; amount: number };
    };
    thisMonth: {
      transactions: number;
      deposits: { count: number; amount: number };
    };
    recentTransactions: Array<{
      id: string;
      type: string;
      amount: number;
      status: string;
      reference: string | null;
      description: string | null;
      user: { id: string; name: string; email: string; medSyncId: string | null } | null;
      createdAt: string;
    }>;
  }>({
    queryKey: ['admin', 'financials', 'wallets'],
    queryFn: async () => {
      const response = await api.get('/admin/financials/wallets');
      return response.data?.data || response.data;
    },
  });

  const initiatePayout = useMutation({
    mutationFn: async (data: { pharmacyId: string; amount: number; notes?: string }) => {
      const response = await api.post('/admin/financials/payouts/initiate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'financials', 'payouts'] });
      setShowPayoutDialog(false);
      setSelectedPayout(null);
      setPayoutNotes('');
    },
  });

  const settlements = settlementsData?.settlements || [];
  const pendingPayouts = pendingPayoutsData?.payouts || [];
  const payoutHistory = payoutHistoryData?.payouts || [];
  const isLoading = summaryLoading;

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/admin/financials/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export financial report:', error);
    }
  };

  return (
    <RoleGuard
      allowedRoles={['ADMIN']}
      fallback={
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Financial Oversight</h1>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              You need admin access to view financials.
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Oversight</h1>
            <p className="text-muted-foreground">
              Monitor revenue, fees, and settlements
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Report Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={() => refetch()}>Apply</Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Gross Volume"
                value={formatCurrency(summary?.summary.grossVolume || 0, summary?.summary.currency)}
                icon={TrendingUp}
                variant="success"
                description={`${summary?.summary.totalOrders || 0} orders`}
              />
              <StatCard
                title="Platform Fees"
                value={formatCurrency(summary?.summary.platformFees || 0, summary?.summary.currency)}
                icon={DollarSign}
                description="5% of gross"
              />
              <StatCard
                title="Net Payable"
                value={formatCurrency(summary?.summary.netPayable || 0, summary?.summary.currency)}
                icon={Wallet}
                variant="success"
                description="To pharmacies"
              />
              <StatCard
                title="Pending Payments"
                value={formatCurrency(summary?.summary.pendingPayments || 0, summary?.summary.currency)}
                icon={CreditCard}
                variant={summary?.summary.pendingPayments ? 'warning' : 'default'}
                description={`${(summary?.summary.totalOrders || 0) - (summary?.summary.paidOrders || 0)} unpaid`}
              />
            </div>

            {/* Patient Wallet Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Patient Wallets
                </CardTitle>
                <CardDescription>
                  Overview of patient wallet balances and transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {walletLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : walletData ? (
                  <div className="space-y-6">
                    {/* Wallet Stats */}
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(walletData.overview.totalBalance, walletData.overview.currency)}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Balance</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Across {walletData.overview.walletCount} wallets
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(walletData.thisWeek.deposits.amount, walletData.overview.currency)}
                        </div>
                        <p className="text-sm text-muted-foreground">Deposits This Week</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {walletData.thisWeek.deposits.count} transactions
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">
                          {walletData.thisWeek.transactions}
                        </div>
                        <p className="text-sm text-muted-foreground">Transactions This Week</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">
                          {formatCurrency(walletData.overview.averageBalance, walletData.overview.currency)}
                        </div>
                        <p className="text-sm text-muted-foreground">Average Balance</p>
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    {walletData.recentTransactions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Recent Transactions</h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {walletData.recentTransactions.slice(0, 10).map((tx) => (
                                <TableRow key={tx.id}>
                                  <TableCell>
                                    <div>
                                      <div className="text-sm font-medium">{tx.user?.name || 'Unknown'}</div>
                                      <div className="text-xs text-muted-foreground">{tx.user?.email}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={tx.type === 'DEPOSIT' ? 'default' : 'secondary'}>
                                      {tx.type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={`text-right font-medium ${tx.type === 'DEPOSIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(tx.amount, walletData.overview.currency)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={tx.status === 'COMPLETED' ? 'default' : tx.status === 'PENDING' ? 'secondary' : 'destructive'}>
                                      {tx.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(tx.createdAt), 'MMM d, h:mm a')}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No wallet data available</p>
                )}
              </CardContent>
            </Card>

            {/* Pharmacy Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Pharmacy Breakdown
                </CardTitle>
                <CardDescription>
                  Revenue by pharmacy for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary?.pharmacyBreakdown && summary.pharmacyBreakdown.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pharmacy</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Gross Volume</TableHead>
                          <TableHead className="text-right">Platform Fee</TableHead>
                          <TableHead className="text-right">Net Payable</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.pharmacyBreakdown.map((pharmacy) => (
                          <TableRow key={pharmacy.pharmacyId}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{pharmacy.pharmacyName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{pharmacy.orderCount}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(pharmacy.grossVolume)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(pharmacy.platformFees)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              {formatCurrency(pharmacy.netPayable)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No financial data for this period</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Settlements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Recent Settlements
                </CardTitle>
                <CardDescription>
                  Daily settlement summaries by pharmacy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {settlementsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : settlements.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Pharmacy</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">Fee</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settlements.slice(0, 20).map((settlement, idx) => (
                          <TableRow key={`${settlement.pharmacyId}-${settlement.date}-${idx}`}>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(new Date(settlement.date), 'MMM d, yyyy')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{settlement.pharmacyName}</span>
                            </TableCell>
                            <TableCell className="text-right">{settlement.orderCount}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(settlement.grossAmount)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(settlement.platformFee)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              {formatCurrency(settlement.netAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  settlement.status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                                }
                              >
                                {settlement.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No settlements found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Payouts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Pending Payouts
                  {pendingPayoutsData?.summary && (
                    <Badge variant="outline" className="ml-2">
                      {formatCurrency(pendingPayoutsData.summary.totalPendingAmount)} pending
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Pharmacies with verified accounts ready for payout
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payoutsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingPayouts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pharmacy</TableHead>
                          <TableHead>Bank Account</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">Net Payable</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingPayouts.map((payout) => (
                          <TableRow key={payout.pharmacyId}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{payout.pharmacyName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {payout.bankName ? (
                                <div className="text-sm">
                                  <p>{payout.bankName}</p>
                                  <p className="text-muted-foreground font-mono">
                                    {payout.accountNumber} • {payout.accountName}
                                  </p>
                                  {payout.accountVerified && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not configured</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{payout.orderCount}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(payout.grossAmount)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              {formatCurrency(payout.netAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedPayout(payout);
                                  setShowPayoutDialog(true);
                                }}
                                disabled={!payout.accountVerified || payout.netAmount <= 0}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Initiate
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-emerald-600" />
                    <p>No pending payouts</p>
                    <p className="text-sm mt-1">All verified pharmacies are settled</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payout History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Payout History
                </CardTitle>
                <CardDescription>
                  Record of initiated payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : payoutHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Pharmacy</TableHead>
                          <TableHead>Bank Account</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Initiated By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payoutHistory.map((payout) => (
                          <TableRow key={payout.id}>
                            <TableCell>
                              <span className="text-sm">
                                {format(new Date(payout.initiatedAt), 'MMM d, yyyy HH:mm')}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{payout.pharmacyName}</TableCell>
                            <TableCell>
                              {payout.bankName ? (
                                <span className="text-sm text-muted-foreground">
                                  {payout.bankName} • {payout.accountNumber}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              {formatCurrency(payout.amount, payout.currency)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{payout.status}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {payout.initiatedBy}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payout history</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Notice */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      Payout Processing Notice
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Initiating a payout creates a record in the system. Actual bank transfers require
                      integration with payment providers (Paystack/Flutterwave). The payout record will
                      be logged for audit purposes. Admins cannot modify order prices or fees.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Payout Confirmation Dialog */}
        <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Initiate Payout</DialogTitle>
              <DialogDescription>
                Confirm payout details for {selectedPayout?.pharmacyName}
              </DialogDescription>
            </DialogHeader>
            {selectedPayout && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Pharmacy</p>
                    <p className="font-medium">{selectedPayout.pharmacyName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Net Amount</p>
                    <p className="font-medium text-emerald-600 text-lg">
                      {formatCurrency(selectedPayout.netAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bank</p>
                    <p className="font-medium">{selectedPayout.bankName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Account</p>
                    <p className="font-mono">{selectedPayout.accountNumber}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Account Name</p>
                    <p className="font-medium">{selectedPayout.accountName}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Input
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    placeholder="Add any notes for this payout..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedPayout) {
                    initiatePayout.mutate({
                      pharmacyId: selectedPayout.pharmacyId,
                      amount: selectedPayout.netAmount,
                      notes: payoutNotes || undefined,
                    });
                  }
                }}
                disabled={initiatePayout.isPending}
              >
                {initiatePayout.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Confirm Payout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
