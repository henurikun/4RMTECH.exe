import { useMemo, useState } from 'react';
import type { Product } from '../data/products';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Product | null;
  onAddToCart: (selection: { selectedGroupItemId?: string; selectedGroupItemIds?: string[] }) => void;
  onBuyNow: (selection: { selectedGroupItemId?: string; selectedGroupItemIds?: string[] }) => void;
};

export default function GroupItemSelectionModal({ open, onOpenChange, group, onAddToCart, onBuyNow }: Props) {
  const members = group?.groupItems ?? [];
  const isVariant = group?.groupType === 'variant';
  const isSet = group?.groupType === 'set';
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

  const ready = useMemo(() => {
    if (!group) return false;
    if (isVariant) return Boolean(selectedVariantId);
    return isSet;
  }, [group, isSet, isVariant, selectedVariantId]);

  const selectedIds = useMemo(() => {
    if (isVariant) return selectedVariantId ? [selectedVariantId] : [];
    if (isSet) return members.map((m) => m.productId);
    return [];
  }, [isSet, isVariant, members, selectedVariantId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#0b0f1d] border-white/10 text-[#F4F6FA]">
        <DialogHeader>
          <DialogTitle>{group?.name ?? 'Select item'}</DialogTitle>
          <DialogDescription className="text-[#A8ACB8]">
            {isVariant
              ? 'Choose one item variant before continuing.'
              : 'This set includes all items shown below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 py-2">
          <Carousel opts={{ align: 'start', loop: members.length > 1 }}>
            <CarouselContent>
              {members.map((item) => {
                const selected = selectedVariantId === item.productId;
                return (
                  <CarouselItem key={item.productId}>
                    <button
                      type="button"
                      disabled={!isVariant}
                      onClick={() => {
                        if (isVariant) setSelectedVariantId(item.productId);
                      }}
                      className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                        selected || isSet
                          ? 'border-[#FFD700] bg-[#FFD700]/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      } ${isVariant ? '' : 'cursor-default'}`}
                    >
                      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white/5 mb-3">
                        <img
                          src={item.image ?? group?.image ?? '/images/laptop_desk.jpg'}
                          alt={item.name ?? item.productId}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="font-semibold text-[#F4F6FA]">{item.name ?? item.productId}</p>
                      {item.description ? (
                        <p className="text-sm text-[#A8ACB8] mt-1">{item.description}</p>
                      ) : null}
                      {isSet && item.qtyPerSet && item.qtyPerSet > 1 ? (
                        <p className="text-xs text-[#FFD700] mt-2">Quantity per set: {item.qtyPerSet}</p>
                      ) : null}
                    </button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="left-0" />
            <CarouselNext className="right-0" />
          </Carousel>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-full bg-white/5 text-[#A8ACB8] hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              onAddToCart({
                selectedGroupItemId: isVariant ? selectedVariantId : undefined,
                selectedGroupItemIds: isSet ? selectedIds : undefined,
              });
              onOpenChange(false);
            }}
            className="px-4 py-2 rounded-full bg-white/10 text-[#F4F6FA] hover:bg-white/20 disabled:opacity-50"
          >
            Add to cart
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              onBuyNow({
                selectedGroupItemId: isVariant ? selectedVariantId : undefined,
                selectedGroupItemIds: isSet ? selectedIds : undefined,
              });
              onOpenChange(false);
            }}
            className="px-4 py-2 rounded-full bg-[#FFD700] text-[#070A15] font-semibold hover:bg-[#ffe44d] disabled:opacity-50"
          >
            Buy now
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
