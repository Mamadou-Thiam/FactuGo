import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getClients,
  createClient,
  createInvoice,
  getNextInvoiceNumber,
  downloadPdf,
} from '../services/api';
import toast from 'react-hot-toast';

interface Client {
  id: number;
  name: string;
  phone: string;
  address: string | null;
}

interface InvoiceItem {
  designation: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface CreatedInvoice {
  id: number;
  number: string;
  clientName: string;
  clientPhone: string;
  total: number;
  amountPaid: number;
  status: string;
}

const emptyItem: InvoiceItem = { designation: '', quantity: 1, unitPrice: 0, discount: 0 };

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '' });
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ESPECES');
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);
  const [amountPaid, setAmountPaid] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<CreatedInvoice | null>(null);

  useEffect(() => {
    getNextInvoiceNumber()
      .then((res) => setInvoiceNumber(res.data.number))
      .catch(() => {});
    getClients()
      .then((res) => setClients(res.data))
      .catch(() => {});
  }, []);

  const addItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

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
    const subtotal = item.unitPrice * item.quantity;
    return subtotal - subtotal * (item.discount / 100);
  };

  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const totalDiscount = items.reduce((acc, item) => {
    const lineSubtotal = item.unitPrice * item.quantity;
    return acc + lineSubtotal * (item.discount / 100);
  }, 0);
  const total = subtotal - totalDiscount;
  const reste = total - amountPaid;

  const getStatus = () => {
    if (amountPaid >= total && total > 0) return 'PAYE';
    if (amountPaid > 0) return 'PARTIEL';
    return 'NON_PAYE';
  };

  const handleCreateClientAndInvoice = async () => {
    if (!newClient.name || !newClient.phone) {
      toast.error('Nom et téléphone du client requis');
      return null;
    }
    try {
      const res = await createClient(newClient);
      return res.data.id;
    } catch {
      toast.error('Erreur lors de la création du client');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNewClient && !selectedClientId) {
      toast.error('Sélectionnez un client');
      return;
    }

    if (items.some((item) => !item.designation || item.quantity <= 0 || item.unitPrice <= 0)) {
      toast.error('Vérifiez les articles (désignation, quantité et prix requis)');
      return;
    }

    setLoading(true);
    try {
      let clientId = selectedClientId;

      if (isNewClient) {
        clientId = await handleCreateClientAndInvoice();
        if (!clientId) {
          setLoading(false);
          return;
        }
      }

      const invoiceData = {
        clientId,
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
      };

      const res = await createInvoice(invoiceData);
      setCreatedInvoice(res.data);
      toast.success('Facture créée avec succès');
    } catch {
      toast.error('Erreur lors de la création de la facture');
    } finally {
      setLoading(false);
    }
  };

  if (createdInvoice) {
    const formatCFA = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';
    const whatsappUrl = (() => {
      const cleanPhone = createdInvoice.clientPhone.replace(/[^0-9]/g, '');
      const message = encodeURIComponent(
        `Bonjour ${createdInvoice.clientName},\n\n` +
        `Merci pour votre achat chez Seck Ndanane Apple.\n\n` +
        `Votre facture ${createdInvoice.number} est prête.\n\n` +
        `Montant total : ${formatCFA(createdInvoice.total)}\n` +
        `Montant payé : ${formatCFA(createdInvoice.amountPaid)}\n` +
        `Reste à payer : ${formatCFA(createdInvoice.total - createdInvoice.amountPaid)}\n\n` +
        `Merci pour votre confiance.\n\n` +
        `📍 Colobane / Fadia\n` +
        `📞 78 107 72 69`
      );
      return `https://wa.me/221${cleanPhone}?text=${message}`;
    })();

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Facture créée !</h2>
          <p className="text-gray-500 mb-6 text-sm sm:text-base">
            Facture <span className="font-semibold text-gray-800">{createdInvoice.number}</span> pour{' '}
            <span className="font-semibold text-gray-800">{createdInvoice.clientName}</span>
          </p>

          <div className="bg-gray-50 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 text-left">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total :</span>
                <span className="block text-lg sm:text-xl font-bold text-gray-800">{formatCFA(createdInvoice.total)}</span>
              </div>
              <div>
                <span className="text-gray-500">Payé :</span>
                <span className="block text-lg sm:text-xl font-bold text-green-600">{formatCFA(createdInvoice.amountPaid)}</span>
              </div>
              {createdInvoice.total - createdInvoice.amountPaid > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-500">Reste :</span>
                  <span className="block text-lg sm:text-xl font-bold text-red-600">
                    {formatCFA(createdInvoice.total - createdInvoice.amountPaid)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => downloadPdf(createdInvoice.id, `${createdInvoice.number}.pdf`).catch(() => toast.error('Erreur PDF'))}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Télécharger PDF
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Envoyer WhatsApp
            </a>
          </div>

          <button
            onClick={() => {
              setCreatedInvoice(null);
              setItems([{ ...emptyItem }]);
              setSelectedClientId(null);
              setIsNewClient(false);
              setNewClient({ name: '', phone: '', address: '' });
              setAmountPaid(0);
              getNextInvoiceNumber().then((res) => setInvoiceNumber(res.data.number));
            }}
            className="mt-6 text-blue-600 hover:text-blue-800 font-medium"
          >
            + Créer une autre facture
          </button>
          <button
            onClick={() => navigate('/factures')}
            className="mt-4 block w-full text-gray-500 hover:text-gray-700 text-sm"
          >
            Retour aux factures
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Nouvelle facture</h1>
        <span className="text-sm text-gray-500">N° {invoiceNumber}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Client Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Informations client</h2>

          <div className="flex gap-2 sm:gap-4 mb-4">
            <button
              type="button"
              onClick={() => setIsNewClient(false)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                !isNewClient ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Client existant
            </button>
            <button
              type="button"
              onClick={() => setIsNewClient(true)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                isNewClient ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Nouveau client
            </button>
          </div>

          {!isNewClient ? (
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            >
              <option value="">-- Sélectionner un client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.phone}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <input
                type="text"
                placeholder="Nom complet *"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <input
                type="text"
                placeholder="Numéro WhatsApp *"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <input
                type="text"
                placeholder="Adresse"
                value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          )}
        </div>

        {/* Invoice Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Informations facture</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Numéro</label>
              <input
                type="text"
                value={invoiceNumber}
                readOnly
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Échéance (optionnel)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Articles</h2>
            <button
              type="button"
              onClick={addItem}
              className="bg-blue-100 text-blue-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-200 transition-colors"
            >
              + Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-end">
                {/* Mobile: stacked fields */}
                <div className="sm:col-span-5">
                  {index === 0 && <label className="block text-xs text-gray-500 mb-1 sm:hidden">Désignation</label>}
                  {index === 0 && <label className="hidden sm:block text-xs text-gray-500 mb-1">Désignation</label>}
                  <input
                    type="text"
                    placeholder="Désignation"
                    value={item.designation}
                    onChange={(e) => updateItem(index, 'designation', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:col-span-5">
                  <div>
                    {index === 0 && <label className="block text-xs text-gray-500 mb-1">Qté</label>}
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-full px-2 sm:px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    />
                  </div>
                  <div>
                    {index === 0 && <label className="block text-xs text-gray-500 mb-1">Prix unit.</label>}
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                      className="w-full px-2 sm:px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    />
                  </div>
                  <div>
                    {index === 0 && <label className="block text-xs text-gray-500 mb-1">Remise %</label>}
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount || ''}
                      onChange={(e) => updateItem(index, 'discount', e.target.value)}
                      className="w-full px-2 sm:px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between sm:col-span-2">
                  <div className="flex-1 sm:flex-none">
                    {index === 0 && <label className="block text-xs text-gray-500 mb-1 sm:hidden">Total ligne</label>}
                    <div className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 text-right sm:text-center">
                      {calculateLineTotal(item).toLocaleString('fr-FR')} F
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="ml-2 w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment & Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Payment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Paiement</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="ESPECES">Espèces</option>
                  <option value="WAVE">Wave</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                  <option value="CARTE_BANCAIRE">Carte bancaire</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Montant payé</label>
                <input
                  type="number"
                  min="0"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="0"
                />
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

          {/* Totals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Résumé</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sous-total</span>
                <span className="font-medium">{subtotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Remise</span>
                  <span className="font-medium text-red-600">-{totalDiscount.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="text-lg font-bold text-gray-800">Total</span>
                <span className="text-lg font-bold text-gray-800">{total.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payé</span>
                <span className="font-semibold text-green-600">{amountPaid.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {reste > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reste à payer</span>
                  <span className="font-semibold text-red-600">{reste.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate('/factures')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors order-2 sm:order-1"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 order-1 sm:order-2"
          >
            {loading ? 'Création...' : 'Créer la facture'}
          </button>
        </div>
      </form>
    </div>
  );
}
