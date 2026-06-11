import React, { createContext, useCallback, useContext, useState } from 'react';

interface CartCountContextType {
  cartCount: number;
  setCartCount: (n: number) => void;
  incrementCart: (by?: number) => void;
  decrementCart: (by?: number) => void;
}

const CartCountContext = createContext<CartCountContextType>({
  cartCount: 0,
  setCartCount: () => {},
  incrementCart: () => {},
  decrementCart: () => {},
});

export const CartCountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);

  const incrementCart = useCallback((by = 1) => {
    setCartCount((c) => c + by);
  }, []);

  const decrementCart = useCallback((by = 1) => {
    setCartCount((c) => Math.max(0, c - by));
  }, []);

  return (
    <CartCountContext.Provider value={{ cartCount, setCartCount, incrementCart, decrementCart }}>
      {children}
    </CartCountContext.Provider>
  );
};

export const useCartCount = () => useContext(CartCountContext);
