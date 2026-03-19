import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Filter, ShoppingCart, Check, Star } from 'lucide-react';
import { allProducts, type Product } from '../data/products';
import { useCart } from '../context/CartContext';

const categoryNames: Record<string, string> = {
  laptops: 'Laptops',
  wearables: 'Wearables',
  audio: 'Audio',
  devices: 'Devices',
  consoles: 'Consoles',
};

export default function ProductListingPage() {
  const { category } = useParams<{ category: string }>();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<'all' | 'budget' | 'premium'>('all');
  const [sort, setSort] = useState<'price-low' | 'price-high' | 'featured'>('featured');
  const { addItem, totalItems, items } = useCart();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(amount);

  useEffect(() => {
    if (category) {
      const q = (searchParams.get('q') ?? '').trim().toLowerCase();

      let filtered =
        category === 'all' ? [...allProducts] : allProducts.filter(p => p.category === category);

      if (q) {
        filtered = filtered.filter((p) => {
          const haystack = [
            p.name,
            p.description,
            p.badge ?? '',
            p.category,
            ...Object.entries(p.specs).flatMap(([k, v]) => [k, v]),
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        });
      }
      
      if (filter === 'budget') {
        filtered = filtered.filter(p => p.price < 500);
      } else if (filter === 'premium') {
        filtered = filtered.filter(p => p.price >= 500);
      }

      if (sort === 'price-low') {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sort === 'price-high') {
        filtered.sort((a, b) => b.price - a.price);
      }

      setProducts(filtered);
    }
  }, [category, filter, sort, searchParams]);

  const isInCart = (productId: string) => items.some((i) => i.productId === productId);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#070A15]/85 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-6 lg:px-12 py-4">
          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <h1 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">
              {category ? categoryNames[category] || 'Products' : 'Products'}
            </h1>
          </div>
          
          <Link to="/cart" className="flex items-center gap-2 text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-mono text-sm">({totalItems})</span>
          </Link>
        </div>
      </header>

      {/* Filters */}
      <div className="px-6 lg:px-12 py-6 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#A8ACB8]" />
            <span className="text-sm text-[#A8ACB8]">Filter:</span>
          </div>
          
          <div className="flex gap-2">
            {(['all', 'budget', 'premium'] as const).map((f) => (
                <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-[#FFD700] text-[#070A15]'
                    : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-[#A8ACB8]">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Sort products"
              title="Sort products"
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <main className="px-6 lg:px-12 py-12">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#A8ACB8] text-lg">No products found in this category.</p>
            <Link to="/" className="inline-block mt-4 text-[#FFD700] hover:underline">
              Return to home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="group bg-[#111318] rounded-2xl overflow-hidden border border-white/5 hover:border-[#FFD700]/30 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.badge && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-[#FFD700] text-[#070A15] text-xs font-bold rounded-full">
                      {product.badge}
                    </div>
                  )}
                  {product.originalPrice && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-red-500/90 text-white text-xs font-bold rounded-full">
                      Save {formatCurrency(product.originalPrice - product.price)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA] mb-2">
                    {product.name}
                  </h3>
                  
                  <p className="text-[#A8ACB8] text-sm mb-4 line-clamp-2">
                    {product.description}
                  </p>

                  {/* Specs */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {Object.entries(product.specs).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="text-[#A8ACB8]">{key}:</span>
                        <span className="text-[#F4F6FA] ml-1">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div>
                      <span className="font-['Space_Grotesk'] text-2xl font-bold text-[#FFD700]">
                        {formatCurrency(product.price)}
                      </span>
                      {product.originalPrice && (
                        <span className="ml-2 text-sm text-[#A8ACB8] line-through">
                          {formatCurrency(product.originalPrice)}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => addItem(product.id, 1)}
                      disabled={isInCart(product.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                        isInCart(product.id)
                          ? 'bg-green-500/20 text-green-400 cursor-default'
                          : 'bg-[#FFD700] text-[#070A15] hover:bg-[#ffe44d]'
                      }`}
                    >
                      {isInCart(product.id) ? (
                        <>
                          <Check className="w-4 h-4" />
                          Added
                        </>
                      ) : (
                        'Add to Cart'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* PC Builder CTA */}
      <section className="px-6 lg:px-12 py-12 border-t border-white/5">
        <div className="bg-gradient-to-r from-[#4169E1]/25 to-[#FFD700]/10 rounded-3xl p-8 lg:p-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="font-['Space_Grotesk'] text-2xl lg:text-3xl font-bold text-[#F4F6FA] mb-3">
                Build Your Dream PC
              </h2>
              <p className="text-[#A8ACB8] max-w-lg">
                Customize every component to match your needs and budget. 
                Our PC Builder helps you create the perfect rig.
              </p>
            </div>
            <Link
              to="/pc-builder"
              className="flex items-center gap-2 px-8 py-4 bg-[#FFD700] text-[#070A15] font-bold rounded-full hover:bg-[#ffe44d] transition-colors whitespace-nowrap"
            >
              <Star className="w-5 h-5" />
              Start Building
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
