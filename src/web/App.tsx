import React, { useState, useEffect } from 'react';
import { PRODUCT, ProductModel, ProductColor, calculateOrderPrice } from '../config/products';
import { OrderSuccessResponse } from '../shared/types';
import { initTracking, TrackingParams } from './utils/tracking';
import { MetaPixel } from './utils/pixel';

import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Gallery } from './components/Gallery';
import { ModelColorSelector } from './components/ModelColorSelector';
import { Benefits } from './components/Benefits';
import { OrderForm } from './components/OrderForm';
import { FAQ } from './components/FAQ';
import { StickyBuyButton } from './components/StickyBuyButton';
import { ThankYouView } from './components/ThankYouView';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<ProductModel>(PRODUCT.models[0]);
  const [selectedColor, setSelectedColor] = useState<ProductColor>(PRODUCT.colors[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [tracking, setTracking] = useState<TrackingParams>({ sourceUrl: '' });
  const [successOrder, setSuccessOrder] = useState<OrderSuccessResponse | null>(null);

  // Initialize tracking & trigger ViewContent after 3 seconds or on first scroll
  useEffect(() => {
    const params = initTracking();
    setTracking(params);

    let hasTrackedViewContent = false;
    const fireViewContent = () => {
      if (hasTrackedViewContent) return;
      hasTrackedViewContent = true;
      const currency = import.meta.env.VITE_META_CURRENCY || 'USD';
      const usdRate = parseFloat(import.meta.env.VITE_USD_RATE || '1310');
      const val = currency === 'IQD' ? PRODUCT.basePriceIQD : Number((PRODUCT.basePriceIQD / usdRate).toFixed(2));
      MetaPixel.viewContent(PRODUCT.nameAr, Math.max(0.01, val), currency);
    };

    // 1. Timer after 3 seconds
    const timer = setTimeout(fireViewContent, 3000);

    // 2. Or on first user scroll
    const onScroll = () => {
      if (window.scrollY > 80) {
        fireViewContent();
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollToOrder = () => {
    const el = document.getElementById('order-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOrderSuccess = (order: OrderSuccessResponse) => {
    setSuccessOrder(order);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setSuccessOrder(null);
    setQuantity(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentPricing = calculateOrderPrice(PRODUCT.id, quantity);

  return (
    <div className="min-h-screen bg-[#0f0f11] text-gray-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1">
        {successOrder ? (
          <ThankYouView order={successOrder} onReset={handleReset} />
        ) : (
          <>
            <Hero onOrderClick={scrollToOrder} />
            <Gallery />

            <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 bg-[#141419] p-5 md:p-8 rounded-3xl border border-gray-800 shadow-xl">
                <ModelColorSelector
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                  selectedColor={selectedColor}
                  onSelectColor={setSelectedColor}
                  quantity={quantity}
                  onChangeQuantity={setQuantity}
                />
              </div>

              <div className="lg:col-span-5">
                <OrderForm
                  selectedModel={selectedModel}
                  selectedColor={selectedColor}
                  quantity={quantity}
                  tracking={tracking}
                  onSuccess={handleOrderSuccess}
                />
              </div>
            </div>

            <Benefits />
            <FAQ />

            <StickyBuyButton
              totalPriceIQD={currentPricing.totalPriceIQD}
              onOrderClick={scrollToOrder}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;
