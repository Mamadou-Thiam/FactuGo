import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getInvoices, downloadPdf, deleteInvoice } from '../services/api';
import toast from 'react-hot-toast';

interface Invoice {
  id: number;
  number: string;
  clientName: string;
  clientPhone: string;
  date: string;
  total: number;
  amountPaid: number;
  status: string;
  paymentMethod: string;
}

const formatCFA = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, '.') + ' FCFA';

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

const paymentLabels: Record<string, string> = {
  ESPECES: 'Espèces',
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  CARTE_BANCAIRE: 'Carte Bancaire',
};

function getWhatsAppUrl(phone: string, invoice: Invoice): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const message = encodeURIComponent(
    `Bonjour ${invoice.clientName},\n\n` +
    `Merci pour votre achat chez Seck Ndanane Apple.\n\n` +
    `Votre facture ${invoice.number} est prête.\n\n` +
    `Montant total : ${formatCFA(invoice.total)}\n` +
    `Montant payé : ${formatCFA(invoice.amountPaid)}\n` +
    `Reste à payer : ${formatCFA(invoice.total - invoice.amountPaid)}\n\n` +
    `Merci pour votre confiance.\n\n` +
    `📍 Colobane / Fadia\n` +
    `📞 78 107 72 69`
  );
  return `https://wa.me/221${cleanPhone}?text=${message}`;
}

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInvoices = () => {
    getInvoices()
      .then((res) => setInvoices(res.data))
      .catch(() => toast.error('Erreur lors du chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadInvoices(); }, []);

  const handleDelete = async (id: number, number: string) => {
    if (!confirm(`Supprimer la facture ${number} ? Cette action est irréversible.`)) return;
    try {
      await deleteInvoice(id);
      toast.success('Facture supprimée');
      loadInvoices();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Factures</h1>
        <Link
          to="/factures/nouvelle"
          className="bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base text-center"
        >
          + Nouvelle facture
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase">N° Facture</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase">Client</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-right px-4 py-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="text-right px-4 py-4 text-xs font-semibold text-gray-500 uppercase">Payé</th>
                    <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                    <th className="text-right px-4 py-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        Aucune facture.{' '}
                        <Link to="/factures/nouvelle" className="text-blue-600 underline">Créer une facture</Link>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800 text-sm">{inv.number}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{inv.clientName}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{new Date(inv.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800 text-sm">{formatCFA(inv.total)}</td>
                        <td className="px-4 py-3 text-right text-gray-600 text-sm">{formatCFA(inv.amountPaid)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[inv.status]}`}>
                            {statusLabels[inv.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <button
                              onClick={() => navigate(`/factures/modifier/${inv.id}`)}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold hover:bg-gray-200 transition-colors"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => downloadPdf(inv.id, `${inv.number}.pdf`).catch(() => toast.error('Erreur PDF'))}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-colors"
                            >
                              PDF
                            </button>
                            {inv.clientPhone && (
                              <a
                                href={getWhatsAppUrl(inv.clientPhone, inv)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold hover:bg-green-200 transition-colors"
                              >
                                WhatsApp
                              </a>
                            )}
                            <button
                              onClick={() => handleDelete(inv.id, inv.number)}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200 transition-colors"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                Aucune facture.{' '}
                <Link to="/factures/nouvelle" className="text-blue-600 underline">Créer une facture</Link>
              </div>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">{inv.number}</p>
                      <p className="text-sm text-gray-500">{inv.clientName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[inv.status]}`}>
                      {statusLabels[inv.status]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    {new Date(inv.date).toLocaleDateString('fr-FR')} · {paymentLabels[inv.paymentMethod]}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="font-bold text-gray-800">{formatCFA(inv.total)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Payé</p>
                      <p className="font-semibold text-green-600">{formatCFA(inv.amountPaid)}</p>
                    </div>
                    {inv.total - inv.amountPaid > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Reste</p>
                        <p className="font-semibold text-red-600">{formatCFA(inv.total - inv.amountPaid)}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/factures/modifier/${inv.id}`)}
                      className="py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors text-center"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => downloadPdf(inv.id, `${inv.number}.pdf`).catch(() => toast.error('Erreur PDF'))}
                      className="py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-colors text-center"
                    >
                      📄 PDF
                    </button>
                    {inv.clientPhone && (
                      <a
                        href={getWhatsAppUrl(inv.clientPhone, inv)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors text-center"
                      >
                        💬 WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(inv.id, inv.number)}
                      className="py-2 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors text-center"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
