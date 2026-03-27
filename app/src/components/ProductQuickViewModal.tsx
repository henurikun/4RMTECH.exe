import { useEffect, useMemo, useState } from 'react';
import type { Product } from '../data/products';
import { Dialog, DialogContent } from './ui/dialog';

type Props = {
  open: boolean;
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (selection: { quantity: number; selectedGroupItemId?: string; selectedGroupItemIds?: string[] }) => void;
  onBuyNow: (selection: { quantity: number; selectedGroupItemId?: string; selectedGroupItemIds?: string[] }) => void;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);

export default function ProductQuickViewModal({ open, product, onOpenChange, onAddToCart, onBuyNow }: Props) {
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');

  const isGroup = product?.kind === 'group';
  const isVariant = product?.groupType === 'variant';
  const members = product?.groupItems ?? [];

  const images = useMemo(() => {
    if (!product) return [];
    const memberImages = members.map((m) => m.image).filter(Boolean) as string[];
    return Array.from(new Set([product.image, ...memberImages].filter(Boolean)));
  }, [members, product]);

  const selectedVariant = useMemo(
    () => members.find((m) => m.productId === selectedVariantId),
    [members, selectedVariantId]
  );

  const displayPrice = useMemo(() => {
    if (!product) return 0;
    if (isVariant) return selectedVariant?.price ?? 0;
    return product.price;
  }, [isVariant, product, selectedVariant]);

  const canSubmit = !product ? false : isVariant ? Boolean(selectedVariantId) : true;

  useEffect(() => {
    if (!product) return;
    setQty(1);
    setSelectedImage(product.image);
    setSelectedVariantId('');
  }, [product]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl bg-[#0B0F1D] border-white/10 text-[#F4F6FA] p-0 overflow-hidden outline-none">
        {!product ? null : (
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-6 border-r border-white/10">
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-white/5 mb-3">
                <img src={selectedImage || product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border ${
                      selectedImage === img ? 'border-[#FFD700]' : 'border-white/10'
                    }`}
                  >
                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 space-y-4">
              <h2 className="font-['Space_Grotesk'] text-2xl font-bold">{product.name}</h2>
              <p className="text-[#A8ACB8]">{product.description}</p>
              {isVariant ? (
                <div className="space-y-2">
                  <p className="text-sm text-[#A8ACB8]">Select variant</p>
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => (
                      <button
                        key={m.productId}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(m.productId);
                          if (m.image) setSelectedImage(m.image);
                        }}
                        className={`px-3 py-2 rounded-full text-sm ${
                          selectedVariantId === m.productId
                            ? 'bg-[#FFD700] text-[#070A15]'
                            : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10'
                        }`}
                      >
                        {m.name ?? m.productId}
                      </button>
                    ))}
                  </div>
                  {selectedVariant?.description ? (
                    <p className="text-sm text-[#A8ACB8]">{selectedVariant.description}</p>
                  ) : null}
                </div>
              ) : null}
              <p className="text-3xl font-bold text-[#FFD700]">
                {isVariant && !selectedVariantId ? 'Select variant for price' : formatCurrency(displayPrice)}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#A8ACB8]">Quantity</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-1 rounded bg-white/5 hover:bg-white/10"
                >
                  -
                </button>
                <span className="w-8 text-center">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3 py-1 rounded bg-white/5 hover:bg-white/10"
                >
                  +
                </button>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() =>
                    onAddToCart({
                      quantity: qty,
                      selectedGroupItemId: isVariant ? selectedVariantId : undefined,
                      selectedGroupItemIds: product.groupType === 'set' ? members.map((m) => m.productId) : undefined,
                    })
                  }
                  className="flex-1 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50"
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() =>
                    onBuyNow({
                      quantity: qty,
                      selectedGroupItemId: isVariant ? selectedVariantId : undefined,
                      selectedGroupItemIds: product.groupType === 'set' ? members.map((m) => m.productId) : undefined,
                    })
                  }
                  className="flex-1 px-5 py-3 rounded-full bg-[#FFD700] text-[#070A15] font-semibold hover:bg-[#ffe44d] disabled:opacity-50"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
