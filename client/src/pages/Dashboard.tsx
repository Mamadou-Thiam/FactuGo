import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../services/api';
import toast from 'react-hot-toast';

interface DashboardData {
  totalInvoices: number;
  todayInvoices: number;
  totalRevenue: number;
  unpaidAmount: number;
  recentInvoices: {
    id: number;
    number: string;
    clientName: string;
    date: string;
    total: number;
    amountPaid: number;
    status: string;
    paymentMethod: string;
  }[];
}

const formatCFA = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

const statusColors: Record<string, string> = {
  PAYE: 'bg-green-100 text-green-800',
  PARTIEL: 'bg-yellow-100 text-yellow-800',
  NON_PAYE: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  PAYE: 'Payé',
  PARTIEL: 'Partiel',
  NON_PAYE: 'Non payé',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch(() => toast.error('Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: 'Total factures', value: data.totalInvoices, icon: '📄', color: 'bg-blue-500' },
    { label: "Chiffre d'affaires", value: formatCFA(data.totalRevenue), icon: '💰', color: 'bg-green-500' },
    { label: 'Factures du jour', value: data.todayInvoices, icon: '📅', color: 'bg-purple-500' },
    { label: 'À encaisser', value: formatCFA(data.unpaidAmount), icon: '⏳', color: 'bg-orange-500' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Tableau de bord</h1>
        <Link
          to="/factures/nouvelle"
          className="bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <span>+</span> Nouvelle facture
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} rounded-lg flex items-center justify-center text-white text-lg sm:text-xl shrink-0`}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 truncate">{stat.label}</p>
                <p className="text-base sm:text-xl font-bold text-gray-800 truncate">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">Dernières factures</h2>
          <Link to="/factures" className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium">
            Voir tout →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase">N° Facture</th>
                <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-right px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-right px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase">Payé</th>
                <th className="text-center px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    Aucune facture pour le moment
                  </td>
                </tr>
              ) : (
                data.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-3 sm:py-4 font-medium text-gray-800 text-sm">{inv.number}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-sm">{inv.clientName}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-sm">{new Date(inv.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-semibold text-gray-800 text-sm">{formatCFA(inv.total)}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right text-gray-600 text-sm">{formatCFA(inv.amountPaid)}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${statusColors[inv.status]}`}>
                        {statusLabels[inv.status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
