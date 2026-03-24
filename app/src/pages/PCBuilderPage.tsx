import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Cpu, 
  Monitor, 
  HardDrive, 
  Zap, 
  Box, 
  Wind, 
  Layers,
  ShoppingCart,
  RotateCcw,
  Check,
  AlertCircle,
  Share2
} from 'lucide-react';
import { 
  allComponents, 
  componentCategories, 
  type PCComponent 
} from '../data/pcComponents';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { getStockQuantity, isPurchasable } from '../lib/productAvailability';
import type { Product } from '../data/products';
import { useAuth } from '../context/AuthContext';

interface BuildConfig {
  cpu: PCComponent | null;
  gpu: PCComponent | null;
  motherboard: PCComponent | null;
  ram: PCComponent | null;
  storage: PCComponent | null;
  psu: PCComponent | null;
  case: PCComponent | null;
  cooling: PCComponent | null;
}

type ExtraItem = {
  name: string;
  price: number;
};

const initialBuild: BuildConfig = {
  cpu: null,
  gpu: null,
  motherboard: null,
  ram: null,
  storage: null,
  psu: null,
  case: null,
  cooling: null,
};

const categoryIcons: Record<string, React.ElementType> = {
  cpu: Cpu,
  gpu: Monitor,
  motherboard: Layers,
  ram: HardDrive,
  storage: HardDrive,
  psu: Zap,
  case: Box,
  cooling: Wind,
};

export default function PCBuilderPage() {
  const { addItem, totalItems } = useCart();
  const { products: catalogProducts } = useCatalog();
  const { user } = useAuth();
  const [build, setBuild] = useState<BuildConfig>(initialBuild);
  const [activeCategory, setActiveCategory] = useState<string>('cpu');
  const [budget, setBudget] = useState<number>(30000);
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [cart, setCart] = useState(false);
  const [extras, setExtras] = useState<ExtraItem[]>([]);

  const totalPrice = useMemo(() => {
    const buildTotal = Object.values(build).reduce(
      (sum, component) => sum + (component?.price || 0),
      0
    );
    const extrasTotal = extras.reduce((sum, item) => sum + item.price, 0);
    return buildTotal + extrasTotal;
  }, [build, extras]);

  const totalWattage = useMemo(() => {
    const cpuTdp = parseInt(build.cpu?.specs.TDP || '65');
    const gpuTdp = build.gpu ? parseInt(build.gpu.specs.TDP || '150') : 0;
    return cpuTdp + gpuTdp + 100; // Add 100W for other components
  }, [build]);

  const compatibilityIssues = useMemo(() => {
    const issues: string[] = [];
    
    if (build.cpu && build.motherboard) {
      const cpuSocket = build.cpu.specs.Socket || '';
      const mbSocket = build.motherboard.specs.Socket || '';
      if (cpuSocket !== mbSocket) {
        issues.push(`CPU socket (${cpuSocket}) doesn't match motherboard (${mbSocket})`);
      }
    }

    if (build.psu && totalWattage > parseInt(build.psu.specs.Wattage || '0')) {
      issues.push(`PSU wattage (${build.psu.specs.Wattage}W) may be insufficient for estimated ${totalWattage}W`);
    }

    // RAM compatibility check could be added here
    // if (build.ram && build.motherboard) {
    //   const ramType = build.ram.specs.Type || '';
    //   const mbRamSlots = parseInt(build.motherboard.specs['RAM Slots'] || '4');
    // }

    return issues;
  }, [build, totalWattage]);

  useEffect(() => {
    setShowBudgetWarning(totalPrice > budget);
  }, [totalPrice, budget]);

  const selectComponent = (category: string, component: PCComponent) => {
    setBuild(prev => ({ ...prev, [category]: component }));
  };

  const clearBuild = () => {
    setBuild(initialBuild);
    setExtras([]);
  };

  const addToCart = () => {
    const selectedComponents = Object.values(build).filter(Boolean);
    if (selectedComponents.length === 0 && extras.length === 0) {
      alert('Please select at least one component');
      return;
    }
    
    selectedComponents.forEach((component) => {
      if (component) {
        const liveMatch = findCatalogMatch(component, catalogProducts);
        if (liveMatch) {
          addItem(liveMatch.id, 1, liveMatch);
        } else {
          const productData: Product = {
            id: component.id,
            name: component.name,
            category: component.category,
            price: component.price,
            image: component.image,
            specs: component.specs,
            description: component.description,
            inStock: true
          };
          addItem(component.id, 1, productData);
        }
      }
    });

    extras.forEach((extra, index) => {
      const extraId = `extra-${extra.name.replace(/\s+/g, '-').toLowerCase()}-${index}`;
      const productData = {
        id: extraId,
        name: extra.name,
        category: 'extra',
        price: extra.price,
        image: '/images/pc/case.png',
        specs: {},
        description: 'Extra item included in package',
        inStock: true
      };
      addItem(extraId, 1, productData);
    });

    setCart(true);
    setTimeout(() => setCart(false), 2000);
  };

  // Helper function for budget tier classification
  // const getBudgetTier = (price: number) => {
  //   if (price < 800) return 'budget';
  //   if (price < 1500) return 'mid';
  //   if (price < 2500) return 'high';
  //   return 'enthusiast';
  // };

  const getRecommendedBuild = (tier: string) => {
    const recommendations: Record<string, Partial<BuildConfig>> = {
      budget: {
        cpu: allComponents.cpu.find(c => c.budgetTier === 'budget'),
        gpu: allComponents.gpu.find(c => c.budgetTier === 'budget'),
        motherboard: allComponents.motherboard.find(c => c.budgetTier === 'budget'),
        ram: allComponents.ram.find(c => c.budgetTier === 'budget'),
        storage: allComponents.storage.find(c => c.budgetTier === 'budget'),
        psu: allComponents.psu.find(c => c.budgetTier === 'budget'),
        case: allComponents.case.find(c => c.budgetTier === 'budget'),
        cooling: allComponents.cooling.find(c => c.budgetTier === 'budget'),
      },
      mid: {
        cpu: allComponents.cpu.find(c => c.budgetTier === 'mid'),
        gpu: allComponents.gpu.find(c => c.budgetTier === 'mid'),
        motherboard: allComponents.motherboard.find(c => c.budgetTier === 'mid'),
        ram: allComponents.ram.find(c => c.budgetTier === 'mid'),
        storage: allComponents.storage.find(c => c.budgetTier === 'mid'),
        psu: allComponents.psu.find(c => c.budgetTier === 'mid'),
        case: allComponents.case.find(c => c.budgetTier === 'mid'),
        cooling: allComponents.cooling.find(c => c.budgetTier === 'mid'),
      },
      high: {
        cpu: allComponents.cpu.find(c => c.budgetTier === 'high'),
        gpu: allComponents.gpu.find(c => c.budgetTier === 'high'),
        motherboard: allComponents.motherboard.find(c => c.budgetTier === 'high'),
        ram: allComponents.ram.find(c => c.budgetTier === 'high'),
        storage: allComponents.storage.find(c => c.budgetTier === 'high'),
        psu: allComponents.psu.find(c => c.budgetTier === 'high'),
        case: allComponents.case.find(c => c.budgetTier === 'high'),
        cooling: allComponents.cooling.find(c => c.budgetTier === 'high'),
      },
      enthusiast: {
        cpu: allComponents.cpu.find(c => c.budgetTier === 'enthusiast'),
        gpu: allComponents.gpu.find(c => c.budgetTier === 'enthusiast'),
        motherboard: allComponents.motherboard.find(c => c.budgetTier === 'enthusiast'),
        ram: allComponents.ram.find(c => c.budgetTier === 'enthusiast'),
        storage: allComponents.storage.find(c => c.budgetTier === 'enthusiast'),
        psu: allComponents.psu.find(c => c.budgetTier === 'enthusiast'),
        case: allComponents.case.find(c => c.budgetTier === 'enthusiast'),
        cooling: allComponents.cooling.find(c => c.budgetTier === 'enthusiast'),
      },
    };
    setBuild(recommendations[tier] as BuildConfig);
    setExtras([]);
  };

  const selectedCount = Object.values(build).filter(Boolean).length;
  const isComplete = selectedCount === 8;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(amount);

  const createPresetComponent = (
    category: PCComponent['category'],
    id: string,
    name: string,
    price: number,
    specs: Record<string, string> = {}
  ): PCComponent => ({
    id,
    name,
    category,
    price,
    image:
      category === 'cpu'
        ? '/images/pc/cpu.png'
        : category === 'motherboard'
        ? '/images/pc/motherboard.png'
        : category === 'ram'
        ? '/images/pc/ram.png'
        : category === 'storage'
        ? '/images/pc/ssd.png'
        : category === 'psu'
        ? '/images/pc/psu.png'
        : category === 'case'
        ? '/images/pc/case.png'
        : category === 'cooling'
        ? '/images/pc/cooler.png'
        : '/images/pc/gpu.png',
    specs,
    description: 'Preset component',
    performance: 5,
    budgetTier: 'budget',
  });

  const packagePresets: Array<{
    id: string;
    name: string;
    total: number;
    items: Array<{
      category?: PCComponent['category'];
      name: string;
      price: number;
      specs?: Record<string, string>;
    }>;
  }> = [
    {
      id: 'pkg-r3-3200g',
      name: 'R3 3200G (A520M) + 20" set',
      total: 18535,
      items: [
        { category: 'cpu', name: 'Ryzen 3 3200G', price: 7990, specs: { Socket: 'AM4', TDP: '65W' } },
        { category: 'motherboard', name: 'A520M BIOSTAR', price: 0, specs: { Socket: 'AM4', 'Form Factor': 'mATX' } },
        { category: 'ram', name: '8GB DDR4', price: 3650, specs: { Capacity: '8GB', Type: 'DDR4' } },
        { category: 'storage', name: '120GB SSD 2.5”', price: 1500, specs: { Capacity: '120GB', Type: 'SATA 2.5"' } },
        { category: 'case', name: 'INPLAY X220 CASE', price: 1350 },
        { name: '20” LED Monitor', price: 2300 },
        { name: 'A4TECH (Keyboard/Mouse)', price: 550 },
        { name: 'AVR', price: 285 },
        { name: 'Windows 10 Pro', price: 1000 },
      ],
    },
    {
      id: 'pkg-r5-3400g',
      name: 'R5 3400G (B450M) + 20" set',
      total: 19235,
      items: [
        { category: 'cpu', name: 'Ryzen 5 3400G', price: 8600, specs: { Socket: 'AM4', TDP: '65W' } },
        { category: 'motherboard', name: 'B450M BIOSTAR', price: 0, specs: { Socket: 'AM4', 'Form Factor': 'mATX' } },
        { category: 'ram', name: '8GB DDR4', price: 3650, specs: { Capacity: '8GB', Type: 'DDR4' } },
        { category: 'storage', name: '120GB SSD 2.5”', price: 1500, specs: { Capacity: '120GB', Type: 'SATA 2.5"' } },
        { category: 'case', name: 'INPLAY X220 CASE', price: 1350 },
        { name: '20” LED Monitor', price: 2300 },
        { name: 'A4TECH (Keyboard/Mouse)', price: 550 },
        { name: 'AVR', price: 285 },
        { name: 'Windows 10 Pro', price: 1000 },
      ],
    },
    {
      id: 'pkg-r5-5600gt-a520m',
      name: 'R5 5600GT (A520M) + 20" set',
      total: 23980,
      items: [
        { category: 'cpu', name: 'Ryzen 5 5600GT', price: 12345, specs: { Socket: 'AM4', TDP: '65W' } },
        { category: 'motherboard', name: 'A520M BIOSTAR', price: 0, specs: { Socket: 'AM4', 'Form Factor': 'mATX' } },
        { category: 'ram', name: '8GB DDR4', price: 3650, specs: { Capacity: '8GB', Type: 'DDR4' } },
        { category: 'storage', name: '240GB SSD 2.5”', price: 2500, specs: { Capacity: '240GB', Type: 'SATA 2.5"' } },
        { category: 'case', name: 'INPLAY X220 CASE', price: 1350 },
        { name: '20” LED Monitor', price: 2300 },
        { name: 'A4TECH (Keyboard/Mouse)', price: 550 },
        { name: 'AVR', price: 285 },
        { name: 'Windows 10 Pro', price: 1000 },
      ],
    },
    {
      id: 'pkg-r7-5700g-b450m-ocpc',
      name: 'R7 5700G (B450M OCPC) + 20" set',
      total: 25085,
      items: [
        { category: 'cpu', name: 'Ryzen 7 5700G', price: 14850, specs: { Socket: 'AM4', TDP: '65W' } },
        { category: 'motherboard', name: 'B450M OCPC', price: 0, specs: { Socket: 'AM4', 'Form Factor': 'mATX' } },
        { category: 'ram', name: '8GB DDR4', price: 3650, specs: { Capacity: '8GB', Type: 'DDR4' } },
        { category: 'storage', name: '240GB SSD 2.5”', price: 2450, specs: { Capacity: '240GB', Type: 'SATA 2.5"' } },
        { category: 'case', name: 'INPLAY X220 CASE', price: 1350 },
        { name: '20” LED Monitor', price: 2300 },
        { name: 'A4TECH (Keyboard/Mouse)', price: 550 },
        { name: 'AVR', price: 285 },
        { name: 'Windows 10 Pro', price: 1000 },
      ],
    },
    {
      id: 'pkg-r5-5600gt-esgaming',
      name: 'R5 5600GT (A520M) + ESGAMING set',
      total: 25630,
      items: [
        { category: 'cpu', name: 'Ryzen 5 5600GT', price: 12345, specs: { Socket: 'AM4', TDP: '65W' } },
        { category: 'motherboard', name: 'A520M BIOSTAR', price: 0, specs: { Socket: 'AM4', 'Form Factor': 'mATX' } },
        { category: 'ram', name: '8GB DDR4', price: 3650, specs: { Capacity: '8GB', Type: 'DDR4' } },
        { category: 'storage', name: '240GB SSD', price: 2450, specs: { Capacity: '240GB', Type: 'SSD' } },
        { category: 'case', name: 'ESGAMING LARK CASE', price: 1350 },
        { category: 'psu', name: 'ESGAMING PSU', price: 850, specs: { Wattage: '500W' } },
        { name: '3PCS FAN', price: 850 },
        { name: '20” MONITOR', price: 2300 },
        { name: 'A4TECH', price: 550 },
        { name: 'AVR', price: 285 },
        { name: 'Windows 10 Pro', price: 1000 },
      ],
    },
    {
      id: 'pkg-r7-5700g-a520m-inplay-24',
      name: 'R7 5700G (A520M) + INPLAY + 24" set',
      total: 24485,
      items: [
        { category: 'cpu', name: 'Ryzen 7 5700G', price: 14850, specs: { Socket: 'AM4', TDP: '65W' } },
        { category: 'motherboard', name: 'A520M BIOSTAR', price: 0, specs: { Socket: 'AM4', 'Form Factor': 'mATX' } },
        { category: 'ram', name: '8GB DDR4', price: 3650, specs: { Capacity: '8GB', Type: 'DDR4' } },
        { category: 'storage', name: '240GB SSD', price: 2450, specs: { Capacity: '240GB', Type: 'SSD' } },
        { category: 'case', name: 'INPLAY META A200', price: 1350 },
        { category: 'psu', name: 'INPLAY PSU', price: 850, specs: { Wattage: '500W' } },
        { name: '24” LED MONITOR', price: 4500 },
        { name: 'A4TECH', price: 550 },
        { name: 'AVR', price: 285 },
        { name: 'Windows 10', price: 1000 },
      ],
    },
    {
      id: 'pkg-r7-5700g-msi-robotic',
      name: 'R7 5700G (MSI B450M) + ROBOTIC + 24" set',
      total: 33185,
      items: [
        { category: 'cpu', name: 'Ryzen 7 5700G', price: 11500, specs: { Socket: 'AM4', TDP: '65W' } },
        { category: 'motherboard', name: 'B450M MSI', price: 4250, specs: { Socket: 'AM4', 'Form Factor': 'mATX' } },
        { category: 'ram', name: '8GB DDR4', price: 3650, specs: { Capacity: '8GB', Type: 'DDR4' } },
        { category: 'storage', name: '240GB SSD', price: 2450, specs: { Capacity: '240GB', Type: 'SSD' } },
        { category: 'psu', name: '500W 80+ PSU', price: 2150, specs: { Wattage: '500W', Efficiency: '80+' } },
        { category: 'case', name: 'ROBOTIC CASE', price: 2850 },
        { name: '24” MONITOR', price: 4500 },
        { name: 'A4TECH', price: 550 },
        { name: 'AVR', price: 285 },
        { name: 'Windows 10', price: 1000 },
      ],
    },
    {
      id: 'pkg-r5-5600g-msi-robotic',
      name: 'R5 5600G (MSI B450M) + ROBOTIC + 24" set',
      total: 30680,
      items: [
        { category: 'cpu', name: 'Ryzen 5 5600G', price: 8995, specs: { Socket: 'AM4', TDP: '65W' } },
        { category: 'motherboard', name: 'B450M MSI', price: 4250, specs: { Socket: 'AM4', 'Form Factor': 'mATX' } },
        { category: 'ram', name: '8GB DDR4', price: 3250, specs: { Capacity: '8GB', Type: 'DDR4' } },
        { category: 'storage', name: '240GB SSD', price: 2250, specs: { Capacity: '240GB', Type: 'SSD' } },
        { category: 'psu', name: '500W 80+ PSU', price: 2150, specs: { Wattage: '500W', Efficiency: '80+' } },
        { category: 'case', name: 'ROBOTIC CASE', price: 2850 },
        { name: '24” MONITOR', price: 4500 },
        { name: 'A4TECH', price: 550 },
        { name: 'AVR', price: 285 },
        { name: 'Windows 10', price: 1000 },
      ],
    },
  ];

  const applyPackagePreset = (presetId: string) => {
    const preset = packagePresets.find((p) => p.id === presetId);
    if (!preset) return;

    const nextBuild: BuildConfig = { ...initialBuild };
    const nextExtras: ExtraItem[] = [];

    preset.items.forEach((item, idx) => {
      if (item.category) {
        const component = createPresetComponent(
          item.category,
          `${preset.id}-${item.category}-${idx}`,
          item.name,
          item.price,
          item.specs ?? {}
        );
        nextBuild[item.category] = component;
      } else {
        nextExtras.push({ name: item.name, price: item.price });
      }
    });

    const summed = Object.values(nextBuild).reduce((sum, c) => sum + (c?.price ?? 0), 0)
      + nextExtras.reduce((sum, i) => sum + i.price, 0);
    const adjustment = preset.total - summed;
    if (adjustment !== 0) {
      nextExtras.push({ name: 'Package adjustment', price: adjustment });
    }

    setBuild(nextBuild);
    setExtras(nextExtras);
    setActiveCategory('cpu');
    setBudget((prev) => Math.max(prev, preset.total));
  };

  if (user?.role === 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-[#F4F6FA]">PC Builder disabled for admin</h1>
          <p className="text-[#A8ACB8]">Administrator accounts should use inventory tools, not customer shopping flows.</p>
          <Link to="/admin" className="inline-flex px-6 py-3 rounded-full bg-[#FFD700] text-[#070A15] font-semibold">
            Open inventory
          </Link>
        </div>
      </div>
    );
  }

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
              PC Builder
            </h1>
          </div>
          <Link to="/cart" className="flex items-center gap-2 text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-mono text-sm">({totalItems})</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <button
              onClick={clearBuild}
              className="flex items-center gap-2 px-4 py-2 text-[#A8ACB8] hover:text-red-400 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Clear all selected items</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Left Sidebar - Component Selection */}
        <aside className="w-full lg:w-80 bg-[#111318] border-r border-white/5">
          {/* Budget Presets */}
          <div className="p-6 border-b border-white/5">
            <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-[#A8ACB8] mb-4">
              Quick Presets
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'budget', name: 'Budget', price: '~₱20K', color: 'bg-green-500/20 text-green-400' },
                { id: 'mid', name: 'Mid-Range', price: '~₱35K', color: 'bg-blue-500/20 text-blue-400' },
                { id: 'high', name: 'High-End', price: '~₱55K', color: 'bg-purple-500/20 text-purple-400' },
                { id: 'enthusiast', name: 'Enthusiast', price: '~₱90K+', color: 'bg-orange-500/20 text-orange-400' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => getRecommendedBuild(preset.id)}
                  className={`p-3 rounded-xl text-left transition-all hover:scale-105 ${preset.color}`}
                >
                  <div className="font-semibold text-sm">{preset.name}</div>
                  <div className="text-xs opacity-70">{preset.price}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Package Presets */}
          <div className="p-6 border-b border-white/5">
            <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-[#A8ACB8] mb-4">
              Custom Packages
            </h3>
            <div className="space-y-2">
              {packagePresets.map((p) => {
                return (
                  <button
                    key={p.id}
                    onClick={() => applyPackagePreset(p.id)}
                    className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FFD700]/30 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-[#F4F6FA]">{p.name}</div>
                      <div className="text-sm font-bold text-[#FFD700]">{formatCurrency(p.total)}</div>
                    </div>
                    <div className="text-xs text-[#A8ACB8] mt-2 line-clamp-2">
                      {p.items.map((i) => i.name).join(' • ')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Component List */}
          <div className="p-4">
            <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-[#A8ACB8] mb-4 px-2">
              Components ({selectedCount}/8)
            </h3>
            <div className="space-y-1">
              {componentCategories.map((cat) => {
                const Icon = categoryIcons[cat.id] || Box;
                const selected = build[cat.id as keyof BuildConfig];
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      activeCategory === cat.id
                        ? 'bg-[#FFD700]/10 border border-[#FFD700]/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selected ? 'bg-[#FFD700]/20' : 'bg-white/5'
                    }`}>
                      <Icon className={`w-5 h-5 ${selected ? 'text-[#FFD700]' : 'text-[#A8ACB8]'}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-[#F4F6FA]">{cat.name}</div>
                      {selected ? (
                        <div className="text-xs text-[#FFD700] truncate">{selected.name}</div>
                      ) : (
                        <div className="text-xs text-[#A8ACB8]">Not selected</div>
                      )}
                    </div>
                    {selected && (
                      <Check className="w-4 h-4 text-[#FFD700]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Budget Slider */}
          <div className="mb-8 p-6 bg-[#111318] rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA]">
                  Your Budget
                </h2>
                <p className="text-sm text-[#A8ACB8]">Set your target budget for recommendations</p>
              </div>
              <div className="text-right">
                <div className="font-['Space_Grotesk'] text-2xl font-bold text-[#FFD700]">
                  {formatCurrency(budget)}
                </div>
                <div className={`text-sm ${showBudgetWarning ? 'text-red-400' : 'text-[#A8ACB8]'}`}>
                  Current: {formatCurrency(totalPrice)}
                </div>
              </div>
            </div>
            <input
              type="range"
              aria-label="Budget"
              title="Budget"
              min="10000"
              max="60000"
              step="500"
              value={budget}
              onChange={(e) => setBudget(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#FFD700]"
            />
            <div className="flex justify-between mt-2 text-xs text-[#A8ACB8]">
              <span>{formatCurrency(10000)}</span>
              <span>{formatCurrency(60000)}</span>
            </div>
          </div>

          {/* Compatibility Warnings */}
          {compatibilityIssues.length > 0 && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="font-semibold text-red-400">Compatibility Issues</span>
              </div>
              <ul className="space-y-1">
                {compatibilityIssues.map((issue, i) => (
                  <li key={i} className="text-sm text-red-300">• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Component Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-['Space_Grotesk'] text-xl font-semibold text-[#F4F6FA]">
                Select {componentCategories.find(c => c.id === activeCategory)?.name}
              </h2>
              <span className="text-sm text-[#A8ACB8]">
                {allComponents[activeCategory as keyof typeof allComponents]?.length} options
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allComponents[activeCategory as keyof typeof allComponents]?.map((component) => {
                const isSelected = build[activeCategory as keyof BuildConfig]?.id === component.id;
                const isOverBudget = totalPrice - (build[activeCategory as keyof BuildConfig]?.price || 0) + component.price > budget;
                const liveMatch = findCatalogMatch(component, catalogProducts);
                const outOfStock = liveMatch ? !isPurchasable(liveMatch) : false;
                
                return (
                  <button
                    key={component.id}
                    onClick={() => selectComponent(activeCategory, component)}
                    disabled={(isOverBudget && !isSelected) || (outOfStock && !isSelected)}
                    className={`relative p-5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#FFD700]/10 border-[#FFD700]'
                        : isOverBudget || outOfStock
                        ? 'bg-white/5 border-white/5 opacity-50'
                        : 'bg-[#111318] border-white/5 hover:border-white/20'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#070A15]" />
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        component.budgetTier === 'budget' ? 'bg-green-500/20 text-green-400' :
                        component.budgetTier === 'mid' ? 'bg-blue-500/20 text-blue-400' :
                        component.budgetTier === 'high' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        {component.budgetTier}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-[#F4F6FA] mb-2">{component.name}</h3>
                    {liveMatch && (
                      <p className={`text-xs mb-2 ${outOfStock ? 'text-red-400' : 'text-green-400'}`}>
                        {outOfStock ? 'Out of stock' : `In stock: ${getStockQuantity(liveMatch)}`}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-1 mb-3">
                      {Object.entries(component.specs).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="text-[#A8ACB8]">{key}:</span>
                          <span className="text-[#F4F6FA] ml-1">{value}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <span className="font-['Space_Grotesk'] text-xl font-bold text-[#FFD700]">
                        {formatCurrency(component.price)}
                      </span>
                      <span className="text-xs text-[#A8ACB8]">
                        Perf: {component.performance}/10
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Build Summary */}
        <aside className="w-full lg:w-80 bg-[#111318] border-l border-white/5 p-6">
          <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA] mb-6">
            Build Summary
          </h3>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[#A8ACB8]">Completion</span>
              <span className="text-[#F4F6FA]">{Math.round((selectedCount / 8) * 100)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FFD700] transition-all duration-500"
                style={{ width: `${(selectedCount / 8) * 100}%` }}
              />
            </div>
          </div>

          {/* Selected Components */}
          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
            {Object.entries(build).map(([category, component]) => {
              if (!component) return null;
              const Icon = categoryIcons[category] || Box;
              
              return (
                <div key={category} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <Icon className="w-4 h-4 text-[#A8ACB8]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#A8ACB8] capitalize">{category}</div>
                    <div className="text-sm text-[#F4F6FA] truncate">{component.name}</div>
                  </div>
                  <div className="text-sm font-semibold text-[#FFD700]">
                    {formatCurrency(component.price)}
                  </div>
                </div>
              );
            })}

            {extras.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-mono uppercase tracking-[0.12em] text-[#A8ACB8] mb-2">
                  Extras
                </div>
                <div className="space-y-2">
                  {extras.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-3 p-3 bg-white/5 rounded-xl"
                    >
                      <div className="text-sm text-[#F4F6FA] truncate">{item.name}</div>
                      <div className="text-sm font-semibold text-[#FFD700]">
                        {formatCurrency(item.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Power Estimate */}
          {totalWattage > 100 && (
            <div className="mb-6 p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-[#A8ACB8]">Est. Power Draw</span>
              </div>
              <div className="font-['Space_Grotesk'] text-2xl font-bold text-[#F4F6FA]">
                {totalWattage}W
              </div>
              {build.psu && (
                <div className={`text-xs mt-1 ${
                  parseInt(build.psu.specs.Wattage || '0') >= totalWattage 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  PSU: {build.psu.specs.Wattage}W
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className="border-t border-white/5 pt-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#A8ACB8]">Total</span>
              <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#FFD700]">
                {formatCurrency(totalPrice)}
              </span>
            </div>
            {showBudgetWarning && (
              <div className="text-sm text-red-400">
                {formatCurrency(totalPrice - budget)} over budget
              </div>
            )}
          </div>

          {/* Actions */}
          <button
            onClick={addToCart}
            disabled={selectedCount === 0 && extras.length === 0}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-full font-bold transition-all ${
              selectedCount === 0 && extras.length === 0
                ? 'bg-white/10 text-[#A8ACB8] cursor-not-allowed'
                : cart
                ? 'bg-green-500 text-white'
                : 'bg-[#FFD700] text-[#070A15] hover:bg-[#ffe44d]'
            }`}
          >
            {cart ? (
              <>
                <Check className="w-5 h-5" />
                Added to Cart!
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </>
            )}
          </button>

          {isComplete && (
            <button className="w-full mt-3 flex items-center justify-center gap-2 py-3 border border-white/20 text-[#F4F6FA] rounded-full hover:bg-white/5 transition-colors">
              <Share2 className="w-4 h-4" />
              Share Build
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function findCatalogMatch(component: PCComponent, catalogProducts: Product[]): Product | undefined {
  const byId = catalogProducts.find((p) => p.id === component.id);
  if (byId) return byId;
  const nameNeedle = component.name.trim().toLowerCase();
  return catalogProducts.find(
    (p) => p.name.trim().toLowerCase() === nameNeedle && p.category === component.category
  );
}
