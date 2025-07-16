// ===============================================================
// JAVASCRIPT PRINCIPAL PARA SMOOSH CAFÉ (Modernizado)
// ===============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbx5Fzjov6cYVSDitc3ZNJuOMFdMFri5BBOva6pIty3lgrRsOug-uioROp357mzjOl2w/exec';
const WHATSAPP_NUMBER = '50584016969'; // Tu número de WhatsApp
let allProducts = [];
let selectedVariant = null;

// --- LÓGICA DEL CARRITO ---
const cart = {
    getItems: () => JSON.parse(localStorage.getItem('smooshCart') || '[]'),
    saveItems: (items) => {
        localStorage.setItem('smooshCart', JSON.stringify(items));
        updateCartCount();
    },
    addItem: (product, variant) => {
        let items = cart.getItems();
        const cartItemId = variant ? product.id + variant.sku_suffix : product.id;
        const existingItem = items.find(item => item.cartItemId === cartItemId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            const newItem = {
                cartItemId: cartItemId,
                id: product.id,
                name: variant ? `${product.name} (${variant.name})` : product.name,
                price: variant ? variant.price : product.base_price,
                imageUrl: product.imageUrl,
                quantity: 1
            };
            items.push(newItem);
        }
        cart.saveItems(items);
        showSimpleModal(`${variant ? `${product.name} (${variant.name})` : product.name} ha sido añadido al carrito.`);
    },
    updateQuantity: (cartItemId, newQuantity) => {
        let items = cart.getItems();
        const itemIndex = items.findIndex(item => item.cartItemId === cartItemId);
        if (itemIndex > -1) {
            if (newQuantity > 0) items[itemIndex].quantity = newQuantity;
            else items.splice(itemIndex, 1);
        }
        cart.saveItems(items);
        renderCartPage();
    },
    removeItem: (cartItemId) => {
        let items = cart.getItems().filter(item => item.cartItemId !== cartItemId);
        cart.saveItems(items);
        renderCartPage();
    },
    clear: () => cart.saveItems([]),
    getTotal: () => cart.getItems().reduce((total, item) => total + (item.price * item.quantity), 0)
};

// --- FUNCIONES DE RENDERIZADO ---

function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = cart.getItems().reduce((sum, item) => sum + item.quantity, 0);
}

function renderProducts(productsToRender) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    if (productsToRender.length === 0) {
        grid.innerHTML = '<p class="loader">No hay productos disponibles.</p>';
        return;
    }
    grid.innerHTML = productsToRender.map(p => `
        <div class="product-card fade-in">
            <a href="./producto.html?p=${p.slug}">
                <img src="${p.imageUrl}" alt="${p.name}" loading="lazy">
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p>$${p.base_price.toFixed(2)}</p>
                </div>
            </a>
        </div>
    `).join('');
}

function renderCategoryFilters(products) {
    const filtersContainer = document.getElementById('category-filters');
    if (!filtersContainer) return;
    const categories = ['Todos', ...new Set(products.map(p => p.category))];
    filtersContainer.innerHTML = categories.map(c => `<button class="category-btn ${c === 'Todos' ? 'active' : ''}" data-category="${c}">${c}</button>`).join('');
    document.querySelectorAll('.category-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelector('.category-btn.active').classList.remove('active');
            button.classList.add('active');
            const category = button.dataset.category;
            const filtered = category === 'Todos' ? allProducts : allProducts.filter(p => p.category === category);
            renderProducts(filtered);
        });
    });
}

async function renderProductDetail() {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    const productSlug = new URLSearchParams(window.location.search).get('p');
    if (!productSlug) {
        container.innerHTML = '<p>Producto no encontrado.</p>';
        return;
    }

    if (allProducts.length === 0) await fetchProducts();
    
    const product = allProducts.find(p => p.slug === productSlug);

    if (product) {
        document.title = `${product.name} - Smoosh Café`;
        document.querySelector('meta[name="description"]').setAttribute("content", product.description);

        let initialPrice = product.base_price;
        if (product.variants && product.variants.length > 0) {
            selectedVariant = product.variants[0];
            initialPrice = selectedVariant.price;
        } else {
            selectedVariant = null;
        }

        container.innerHTML = `
            <div class="product-detail-image fade-in">
                <img src="${product.imageUrl}" alt="${product.name}">
            </div>
            <div class="product-detail-info fade-in">
                <span class="category">${product.category}</span>
                <h1>${product.name}</h1>
                <p class="description">${product.description}</p>
                <div id="variants-container"></div>
                <p class="price" id="product-price">$${initialPrice.toFixed(2)}</p>
                <button class="btn-primary" id="add-to-cart-btn">Añadir al Carrito</button>
            </div>
        `;

        renderVariantOptions(product);

        document.getElementById('add-to-cart-btn').addEventListener('click', () => {
            if (product.variants && product.variants.length > 0 && !selectedVariant) {
                showSimpleModal("Por favor, selecciona una opción.");
                return;
            }
            cart.addItem(product, selectedVariant);
        });
    } else {
        container.innerHTML = '<p>Producto no encontrado o no disponible.</p>';
    }
}

function renderVariantOptions(product) {
    const variantsContainer = document.getElementById('variants-container');
    if (!variantsContainer || !product.variants || product.variants.length === 0) return;

    variantsContainer.innerHTML = `
        <div class="variant-options">
            ${product.variants.map((variant, index) => `
                <button class="variant-btn ${index === 0 ? 'active' : ''}" data-variant-index="${index}">
                    ${variant.name}
                </button>
            `).join('')}
        </div>
    `;

    document.querySelectorAll('.variant-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelector('.variant-btn.active')?.classList.remove('active');
            e.target.classList.add('active');
            const variantIndex = parseInt(e.target.dataset.variantIndex);
            selectedVariant = product.variants[variantIndex];
            document.getElementById('product-price').textContent = `$${selectedVariant.price.toFixed(2)}`;
        });
    });
}

function renderCartPage() {
    const itemsContainer = document.getElementById('cart-items-container');
    const summaryContainer = document.getElementById('cart-summary');
    if (!itemsContainer || !summaryContainer) return;
    const items = cart.getItems();
    if (items.length === 0) {
        itemsContainer.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío. <a href="./index.html#menu">Ver menú</a></p>';
        summaryContainer.innerHTML = '';
        return;
    }
    itemsContainer.innerHTML = items.map(item => `
        <div class="cart-item fade-in">
            <img src="${item.imageUrl}" alt="${item.name}">
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <p>$${item.price.toFixed(2)}</p>
            </div>
            <div class="quantity-controls">
                <button class="quantity-btn" data-id="${item.cartItemId}" data-change="-1">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" data-id="${item.cartItemId}" data-change="1">+</button>
            </div>
            <p class="item-total">$${(item.price * item.quantity).toFixed(2)}</p>
            <button class="remove-item-btn" data-id="${item.cartItemId}" title="Eliminar item">&times;</button>
        </div>
    `).join('');
    summaryContainer.innerHTML = `<h3>Resumen</h3><p class="total">Total: $${cart.getTotal().toFixed(2)}</p><a href="./checkout.html" class="btn-primary">Finalizar Compra</a>`;
    
    document.querySelectorAll('.quantity-btn').forEach(button => {
        button.addEventListener('click', e => {
            const cartItemId = e.target.dataset.id;
            const item = cart.getItems().find(i => i.cartItemId === cartItemId);
            cart.updateQuantity(cartItemId, item.quantity + parseInt(e.target.dataset.change));
        });
    });
    document.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', e => cart.removeItem(e.target.dataset.id));
    });
}

function renderCheckoutSummary() {
    const summaryEl = document.getElementById('checkout-summary');
    if (!summaryEl) return;
    const items = cart.getItems();
    if (items.length === 0) {
        window.location.href = './carrito.html';
        return;
    }
    summaryEl.innerHTML = `
        ${items.map(item => `
            <div class="summary-item">
                <span>${item.quantity} x ${item.name}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>`).join('')}
        <div class="summary-item total">
            <span>Total</span>
            <span>$${cart.getTotal().toFixed(2)}</span>
        </div>`;
}

// --- LÓGICA DE LA APLICACIÓN ---

async function fetchProducts() {
    const grid = document.getElementById('product-grid');
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok.');
        const data = await response.json();
        allProducts = data.products || [];
    } catch (error) {
        console.error("Error al cargar los productos:", error);
        if (grid) grid.innerHTML = '<p class="loader">Error al cargar el menú. Intenta de nuevo más tarde.</p>';
    }
}

function generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `SMOOSH-${timestamp}${random}`;
}

async function submitOrder(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-order-btn');
    btn.disabled = true;
    btn.textContent = 'Procesando...';
    
    const form = e.target;
    const orderNumber = generateOrderNumber();
    const orderData = {
        orderNumber: orderNumber,
        customer: { 
            name: form.name.value, 
            email: form.email.value, 
            address: form.address.value, 
            phone: form.phone.value 
        },
        items: cart.getItems(),
        total: cart.getTotal(),
        createdAt: new Date().toISOString()
    };

    try {
        await fetch(API_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData) 
        });
        
        showSuccessModal(orderData);

    } catch (error) {
        console.error('Error submitting order:', error);
        showSimpleModal("Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.");
    } finally {
        btn.disabled = false;
        btn.textContent = 'Realizar Pedido';
    }
}

// --- MODALES ---
function showSimpleModal(message) {
    const modal = document.getElementById('message-modal');
    const textEl = document.getElementById('modal-message-text');
    if (!modal || !textEl) return;

    textEl.innerHTML = `<p>${message}</p>`;
    modal.style.display = 'block';

    const closeModal = () => modal.style.display = 'none';
    modal.querySelector('.close-button').onclick = closeModal;
    window.onclick = e => { if (e.target == modal) closeModal(); };
}

function showSuccessModal(orderData) {
    const modal = document.getElementById('message-modal');
    const textEl = document.getElementById('modal-message-text');
    if (!modal || !textEl) return;

    let whatsappMessage = `¡Hola Smoosh Café! 👋 Quiero confirmar mi pedido:\n\n`;
    whatsappMessage += `*Número de Orden:* ${orderData.orderNumber}\n`;
    whatsappMessage += `*Cliente:* ${orderData.customer.name}\n`;
    whatsappMessage += `*Teléfono:* ${orderData.customer.phone}\n\n`;
    whatsappMessage += `*Pedido:*\n`;
    orderData.items.forEach(item => {
        whatsappMessage += `- ${item.quantity}x ${item.name}\n`;
    });
    whatsappMessage += `\n*Total:* $${orderData.total.toFixed(2)}\n\n`;
    whatsappMessage += `¡Gracias!`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

    textEl.innerHTML = `
        <h3>¡Pedido Realizado con Éxito!</h3>
        <p>Tu número de orden es:</p>
        <div class="order-number">${orderData.orderNumber}</div>
        <p>Por favor, confirma tu pedido enviándonos un mensaje por WhatsApp.</p>
        <a href="${whatsappUrl}" target="_blank" class="btn-primary btn-whatsapp" id="whatsapp-confirm-btn">
            <i class="fab fa-whatsapp"></i> Confirmar por WhatsApp
        </a>
    `;

    modal.style.display = 'block';

    document.getElementById('whatsapp-confirm-btn').onclick = () => {
        setTimeout(() => {
            cart.clear();
            window.location.href = './index.html';
        }, 500); 
    };

    const closeModal = () => {
        modal.style.display = 'none';
        cart.clear();
        window.location.href = './index.html';
    };

    modal.querySelector('.close-button').onclick = closeModal;
}


// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    updateCartCount();
    
    document.querySelector('main')?.classList.add('fade-in');

    const path = window.location.pathname;
    if (path.endsWith('/') || path.endsWith('/index.html')) {
        await fetchProducts();
        renderProducts(allProducts);
        renderCategoryFilters(allProducts);
    } else if (path.endsWith('/producto.html')) {
        await renderProductDetail();
    } else if (path.endsWith('/carrito.html')) {
        renderCartPage();
    } else if (path.endsWith('/checkout.html')) {
        renderCheckoutSummary();
        document.getElementById('checkout-form')?.addEventListener('submit', submitOrder);
    }
});
