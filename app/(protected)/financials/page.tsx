'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Download,
  ArrowUpRight,
  Wallet,
  Receipt,
  PiggyBank,
  Package,
  XCircle,
  Clock,
  CheckCircle,
  Building2,
  AlertCircle,
  Trash2,
  User,
  RefreshCw
} from 'lucide-react';
import { useOrg } from '@/store/useOrg';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/auth/RoleGuard';

interface FinancialSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  pendingRevenue: number;
  pendingOrders: number;
  cancelledOrders: number;
  revenueChange: number;
  ordersChange: number;
}

interface Transaction {
  id: string;
  type: string;
  orderNumber: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  customerMedSyncId?: string | null;
  customerName?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}

interface Payout {
  id: string;
  amount: number;
  date: string;
  status: string;
  reference: string;
}

interface PayoutAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  isVerified: boolean;
}

interface FinancialData {
  summary: FinancialSummary;
  recentTransactions: Transaction[];
  payouts: Payout[];
  payoutAccount: PayoutAccount | null;
  dateRange: {
    start: string;
    end: string;
    range: string;
  };
}

// Nigerian banks list
const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank', code: '214' },
  { name: 'Globus Bank', code: '103' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Opay', code: '999992' },
  { name: 'Palmpay', code: '999991' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function FinancialsPage() {
  const { pharmacyId, locationId, locationName } = useOrg();
  const { roleType } = usePharmacyContext();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [accountForm, setAccountForm] = useState({
    bankCode: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });
  
  // Only Owner can manage payout accounts
  const isOwner = roleType === 'PHARMACY_OWNER';

  // Fetch financial data from API - includes locationId in query key for automatic refetch
  const { data: financialData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['financials', pharmacyId, locationId, dateRange],
    queryFn: async (): Promise<FinancialData> => {
      // locationId is automatically sent via X-Location-Id header by api interceptor
      const response = await api.get(`/pharmacy/financials?range=${dateRange}`);
      
      // The API interceptor may or may not unwrap the response
      // Handle both cases: { summary, ... } or { success: true, data: { summary, ... } }
      let data = response.data;
      
      // If response has success field, it wasn't unwrapped
      if (data && typeof data === 'object' && 'success' in data) {
        data = data.data;
      }
      
      if (!data || typeof data !== 'object' || !data.summary) {
        console.error('Invalid financials response structure:', { responseData: response.data, extractedData: data });
        throw new Error('Invalid response structure');
      }
      return data as FinancialData;
    },
    enabled: !!pharmacyId,
    retry: 1,
  });

  // Fetch paginated transactions - includes locationId in query key for automatic refetch
  const { data: transactionsData } = useQuery({
    queryKey: ['financials-transactions', pharmacyId, locationId],
    queryFn: async () => {
      // locationId is automatically sent via X-Location-Id header by api interceptor
      const response = await api.get('/pharmacy/financials/transactions?limit=50');
      
      // Handle both wrapped and unwrapped responses
      let data = response.data;
      if (data && typeof data === 'object' && 'success' in data) {
        data = data.data;
      }
      return data || { transactions: [] };
    },
    enabled: !!pharmacyId,
    retry: 1,
  });

  // Add payout account mutation
  const addPayoutAccount = useMutation({
    mutationFn: async (data: typeof accountForm) => {
      const response = await api.post('/pharmacy/payout-account', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payout account added successfully');
      setShowAddAccountDialog(false);
      setAccountForm({ bankCode: '', bankName: '', accountNumber: '', accountName: '' });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add payout account');
    },
  });

  // Remove payout account mutation
  const removePayoutAccount = useMutation({
    mutationFn: async () => {
      const response = await api.delete('/pharmacy/payout-account');
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payout account removed');
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove payout account');
    },
  });

  const handleBankSelect = (bankCode: string) => {
    const bank = NIGERIAN_BANKS.find(b => b.code === bankCode);
    if (bank) {
      setAccountForm(prev => ({
        ...prev,
        bankCode: bank.code,
        bankName: bank.name,
      }));
    }
  };

  const handleAddAccount = () => {
    if (!accountForm.bankCode || !accountForm.accountNumber || !accountForm.accountName) {
      toast.error('Please fill in all fields');
      return;
    }
    if (accountForm.accountNumber.length !== 10) {
      toast.error('Account number must be 10 digits');
      return;
    }
    addPayoutAccount.mutate(accountForm);
  };

  // Export orders to CSV
  const handleExport = () => {
    if (!transactions || transactions.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Order Number', 'Date', 'Customer MedSync ID', 'Amount (NGN)', 'Status'];
    const rows = transactions.map((t: Transaction) => [
      t.orderNumber || t.description,
      format(new Date(t.date), 'yyyy-MM-dd HH:mm'),
      t.customerMedSyncId || 'N/A',
      t.amount.toString(),
      t.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders-${dateRange}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Orders exported successfully');
  };

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={['PHARMACY_OWNER']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={['PHARMACY_OWNER']}>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <XCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load financial data</h2>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </RoleGuard>
    );
  }

  const data = financialData;
  const transactions = transactionsData?.transactions || data?.recentTransactions || [];

  // Empty state
  if (!data || (data.summary.totalOrders === 0 && data.summary.pendingOrders === 0)) {
    return (
      <RoleGuard allowedRoles={['PHARMACY_OWNER']}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financials</h1>
            <p className="text-muted-foreground">
              Track your pharmacy's revenue, orders, and payouts
            </p>
          </div>
          
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No financial data yet</h2>
              <p className="text-muted-foreground max-w-md">
                Once you start receiving and completing orders, your financial summary and transactions will appear here.
              </p>
            </CardContent>
          </Card>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['PHARMACY_OWNER']}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Financials</h1>
            {locationId && locationName && (
              <Badge variant="outline" className="text-xs">
                {locationName}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {locationId 
              ? `Financial data for ${locationName}`
              : 'Track your pharmacy\'s revenue, orders, and payouts across all locations'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex border rounded-md">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(range)}
                className="rounded-none first:rounded-l-md last:rounded-r-md"
              >
                {range === '7d' ? '7D' : range === '30d' ? '30D' : range === '90d' ? '90D' : 'All'}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {data.summary.revenueChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">+{data.summary.revenueChange}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{data.summary.revenueChange}%</span>
                </>
              )}
              <span className="ml-1">vs previous period</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.cancelledOrders > 0 && (
                <span className="text-red-500">{data.summary.cancelledOrders} cancelled</span>
              )}
              {data.summary.cancelledOrders === 0 && 'No cancellations'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per completed order
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.pendingRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.pendingOrders} orders being processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Orders and Payouts */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                Your pharmacy's order history with customer MedSync IDs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No orders yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction: Transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          transaction.status === 'completed'
                            ? 'bg-green-100 text-green-600' 
                            : transaction.status === 'cancelled'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {transaction.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : transaction.status === 'cancelled' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">#{transaction.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(transaction.date), 'MMM d, yyyy • h:mm a')}
                          </p>
                          {/* Customer MedSync ID */}
                          <div className="flex items-center gap-1 mt-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-mono text-primary">
                              {transaction.customerMedSyncId || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.status === 'completed' 
                            ? 'text-green-600' 
                            : transaction.status === 'cancelled'
                              ? 'text-red-600 line-through'
                              : 'text-yellow-600'
                        }`}>
                          {formatCurrency(transaction.amount)}
                        </p>
                        <Badge variant={
                          transaction.status === 'completed' 
                            ? 'default' 
                            : transaction.status === 'cancelled'
                              ? 'destructive'
                              : 'secondary'
                        }>
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {transactions.length > 0 && (
                <div className="mt-4 text-center">
                  <Button variant="outline">View All Orders</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>
                Track your earnings and withdrawals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payouts yet</p>
                  <p className="text-sm mt-2">Payouts are processed weekly</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">Payout {payout.reference}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payout.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(payout.amount)}</p>
                        <Badge variant={payout.status === 'completed' ? 'default' : 'secondary'}>
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payout Account Card - Only visible to Owner */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Payout Account</CardTitle>
                <CardDescription>
                  Your connected bank account for receiving payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.payoutAccount ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-green-100 text-green-600">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{data.payoutAccount.bankName}</p>
                          {data.payoutAccount.isVerified && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {data.payoutAccount.accountNumber} • {data.payoutAccount.accountName}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to remove this payout account?')) {
                          removePayoutAccount.mutate();
                        }
                      }}
                      disabled={removePayoutAccount.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-yellow-100 text-yellow-600">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">No bank account connected</p>
                        <p className="text-sm text-muted-foreground">Add a bank account to receive payouts</p>
                      </div>
                    </div>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => setShowAddAccountDialog(true)}
                    >
                      Add Account
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Payout Account Dialog - Only for Owner */}
      {isOwner && (
        <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Payout Account</DialogTitle>
              <DialogDescription>
                Enter your Nigerian bank account details to receive payouts.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="bank">Bank</Label>
                <Select value={accountForm.bankCode} onValueChange={handleBankSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_BANKS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="0123456789"
                  maxLength={10}
                  value={accountForm.accountNumber}
                  onChange={(e) => setAccountForm(prev => ({ 
                    ...prev, 
                    accountNumber: e.target.value.replace(/\D/g, '') 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your 10-digit NUBAN account number
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="John Doe"
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm(prev => ({ 
                    ...prev, 
                    accountName: e.target.value 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the name on your bank account
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddAccountDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddAccount}
                disabled={addPayoutAccount.isPending}
              >
                {addPayoutAccount.isPending ? 'Adding...' : 'Add Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
    </RoleGuard>
  );
}
