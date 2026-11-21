import { Check, Clock3 } from "lucide-react";
import { formatIQD, StorefrontProduct } from "../../config/products";

type ProductCardsProps = {
  id?: string;
  products: StorefrontProduct[];
  selectedProductId: string;
  onSelect: (product: StorefrontProduct) => void;
  disabled?: boolean;
};

export default function ProductCards({
  id = "product-selection",
  products,
  selectedProductId,
  onSelect,
  disabled = false,
}: ProductCardsProps) {
  return (
    <section className="product-choices" id={id} aria-labelledby="product-choices-title">
      <div className="product-choices-heading">
        <div>
          <p className="eyebrow"><span /> الخطوة الأولى — اختار ساعتك</p>
          <h2 id="product-choices-title">أي ساعة تلفت نظرك؟</h2>
          <p className="product-choices-hint">اختار ساعة لتشوف صورها وتفاصيلها ومواصفاتها قبل الطلب.</p>
        </div>
        <span className="product-count">{products.length} {products.length === 1 ? "ساعة" : "ساعات"}</span>
      </div>
      <div className="product-card-grid">
        {products.map((product) => {
          const selected = product.id === selectedProductId;
          const image = product.images[0];
          return (
            <button
              className={`product-card ${selected ? "is-selected" : ""}`}
              type="button"
              key={product.id}
              aria-pressed={selected}
              aria-label={`اختيار ${product.productName}`}
              disabled={disabled}
              onClick={() => onSelect(product)}
            >
              <span className="product-card-image">
                {image ? (
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    style={{
                      objectFit: image.fit ?? "contain",
                      width: `${image.scale ?? 100}%`,
                      height: `${image.scale ?? 100}%`,
                    }}
                  />
                ) : (
                  <span className="product-card-empty">
                    <Clock3 size={30} strokeWidth={1.2} />
                  </span>
                )}
                {selected && (
                  <span className="product-card-check" aria-hidden="true">
                    <Check size={14} />
                  </span>
                )}
              </span>
              <span className="product-card-copy">
                <strong>{product.productName || "ساعة بدون اسم"}</strong>
                <span>{formatIQD(product.priceIQD)}</span>
                <small className="is-available">متوفر للطلب — توصيل مجاني</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
