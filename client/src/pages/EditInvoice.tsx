import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getClients,
  getInvoice,
  updateInvoice,
  downloadPdf,
} from '../services/api';
import toast from 'react-hot-toast';

const IPHONE_MODELS = [
  'iPhone 16 Pro Max',
  'iPhone 16 Pro',
  'iPhone 16 Plus',
  'iPhone 16',
  'iPhone 15 Pro Max',
  'iPhone 15 Pro',
  'iPhone 15 Plus',
  'iPhone 15',
  'iPhone 14 Pro Max',
  'iPhone 14 Pro',
  'iPhone 14 Plus',
  'iPhone 14',
  'iPhone SE (3ème génération)',
  'iPhone 13 Pro Max',
  'iPhone 13 Pro',
  'iPhone 13',
  'iPhone 13 mini',
  'iPhone 12 Pro Max',
  'iPhone 12 Pro',
  'iPhone 12',
  'iPhone 12 mini',
  'iPhone SE (2ème génération)',
  'Accessoire',
  'Autre',
];

interface Client {
  id: number;
  name: string;
  phone: string;
  address: string | null;
}

interface InvoiceItem {
  id?: number;
  designation: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface InvoiceData {
  id: number;
  number: string;
  clientId: number;
  clientName: string;
  clientPhone: string;
  date: string;
  dueDate: string | null;
  paymentMethod: string;
  status: string;
  amountPaid: number;
  total: number;
  items: InvoiceItem[];
}

export default function EditInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ESPECES');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [amountPaid, setAmountPaid] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceId, setInvoiceId] = useState(0);
  const [customDesignations, setCustomDesignations] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getInvoice(parseInt(id)),
      getClients(),
    ])
      .then(([invRes, clientsRes]) => {
        const inv = invRes.data;
        setInvoiceId(inv.id);
        setInvoiceNumber(inv.number);
        setSelectedClientId(inv.clientId);
        setDate(new Date(inv.date).toISOString().split('T')[0]);
        setDueDate(inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '');
        setPaymentMethod(inv.paymentMethod);
        setAmountPaid(inv.amountPaid);
        setItems(inv.items.map((i: any) => ({
          id: i.id,
          designation: i.designation,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
        })));
        setClients(clientsRes.data);
      })
      .catch(() => {
        toast.error('Facture non trouvée');
        navigate('/factures');
      })
      .finally(() => setInitialLoading(false));
  }, [id, navigate]);

  const addItem = () => setItems([...items, { designation: '', quantity: 1, unitPrice: 0, discount: 0 }]);

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    if (field === 'designation') {
      updated[index].designation = value as string;
    } else {
      updated[index][field] = Number(value) || 0;
    }
    setItems(updated);
  };

  const calculateLineTotal = (item: InvoiceItem) => {
    const sub = item.unitPrice * item.quantity;
    return sub - sub * (item.discount / 100);
  };

  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const totalDiscount = items.reduce((acc, item) => {
    const sub = item.unitPrice * item.quantity;
    return acc + sub * (item.discount / 100);
  }, 0);
  const total = subtotal - totalDiscount;
  const reste = total - amountPaid;

  const getStatus = () => {
    if (amountPaid >= total && total > 0) return 'PAYE';
    if (amountPaid > 0) return 'PARTIEL';
    return 'NON_PAYE';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) { toast.error('Sélectionnez un client'); return; }
    if (items.some((item) => !item.designation || item.quantity <= 0 || item.unitPrice <= 0)) {
      toast.error('Vérifiez les articles'); return;
    }
    setLoading(true);
    try {
      await updateInvoice(invoiceId, {
        clientId: selectedClientId,
        date,
        dueDate: dueDate || null,
        paymentMethod,
        status: getStatus(),
        amountPaid,
        items: items.map((item) => ({
          designation: item.designation,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
      });
      toast.success('Facture modifiée');
      navigate('/factures');
    } catch {
      toast.error('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Modifier facture</h1>
        <span className="text-sm text-gray-500">{invoiceNumber}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Client */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Client</h2>
          <select
            value={selectedClientId || ''}
            onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          >
            <option value="">-- Sélectionner un client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
            ))}
          </select>
        </div>

        {/* Invoice Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Informations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Numéro</label>
              <input type="text" value={invoiceNumber} readOnly className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Échéance</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Articles</h2>
            <button type="button" onClick={addItem} className="bg-blue-100 text-blue-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-200 transition-colors">
              + Ajouter
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-end">
                <div className="sm:col-span-5 space-y-1">
                  <label className="block text-xs text-gray-500">Désignation</label>
                  <select
                    value={IPHONE_MODELS.includes(item.designation) || item.designation === '' ? item.designation : 'Autre'}
                    onChange={(e) => {
                      if (e.target.value === 'Autre') {
                        updateItem(index, 'designation', customDesignations[index] || '');
                      } else {
                        updateItem(index, 'designation', e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                  >
                    <option value="">-- Sélectionner --</option>
                    {IPHONE_MODELS.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  {(item.designation !== '' && !IPHONE_MODELS.includes(item.designation)) && (
                    <input
                      type="text"
                      placeholder="Saisir la désignation"
                      value={customDesignations[index] ?? item.designation}
                      onChange={(e) => {
                        setCustomDesignations({ ...customDesignations, [index]: e.target.value });
                        updateItem(index, 'designation', e.target.value);
                      }}
                      className="w-full px-3 py-2.5 border border-orange-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:col-span-5">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Qté</label>
                    <input type="number" min="1" value={item.quantity || ''} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="w-full px-2 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prix unit.</label>
                    <input type="number" min="0" value={item.unitPrice || ''} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} className="w-full px-2 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Remise %</label>
                    <input type="number" min="0" max="100" value={item.discount || ''} onChange={(e) => updateItem(index, 'discount', e.target.value)} className="w-full px-2 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" />
                  </div>
                </div>
                <div className="flex items-center justify-between sm:col-span-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Total</label>
                    <div className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 text-right">
                      {calculateLineTotal(item).toLocaleString('fr-FR').replace(/\s/g, '.')} F
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="ml-2 w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment & Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Paiement</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                  <option value="ESPECES">Espèces</option>
                  <option value="WAVE">Wave</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                  <option value="CARTE_BANCAIRE">Carte bancaire</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Montant payé</label>
                <input type="number" min="0" value={amountPaid || ''} onChange={(e) => setAmountPaid(Number(e.target.value) || 0)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Statut</label>
                <div className="px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-sm font-semibold">
                  {getStatus() === 'PAYE' && <span className="text-green-700">✓ Payé</span>}
                  {getStatus() === 'PARTIEL' && <span className="text-yellow-700">◐ Paiement partiel</span>}
                  {getStatus() === 'NON_PAYE' && <span className="text-red-700">✕ Non payé</span>}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Résumé</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sous-total</span>
                <span className="font-medium">{subtotal.toLocaleString('fr-FR').replace(/\s/g, '.')} FCFA</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Remise</span>
                  <span className="font-medium text-red-600">-{totalDiscount.toLocaleString('fr-FR').replace(/\s/g, '.')} FCFA</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="text-lg font-bold text-gray-800">Total</span>
                <span className="text-lg font-bold text-gray-800">{total.toLocaleString('fr-FR').replace(/\s/g, '.')} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payé</span>
                <span className="font-semibold text-green-600">{amountPaid.toLocaleString('fr-FR').replace(/\s/g, '.')} FCFA</span>
              </div>
              {reste > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reste à payer</span>
                  <span className="font-semibold text-red-600">{reste.toLocaleString('fr-FR').replace(/\s/g, '.')} FCFA</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => navigate('/factures')} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors order-2 sm:order-1">
            Annuler
          </button>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 order-1 sm:order-2">
            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
