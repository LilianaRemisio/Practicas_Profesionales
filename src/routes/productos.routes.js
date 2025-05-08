import { Router } from "express";
import pool from "../database.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Obtener el directorio correcto para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar almacenamiento con Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, "../public/img"); // Ajusta la ruta según la ubicación de `public`
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Inicializa Multer
const upload = multer({ storage });
const router = Router();

router.get('/cart', async (req, res) => { //redireccionar a carrito
    try {
        //const [result] =await pool.query("Select * from productos ");
        res.render('productos/cart');
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});


router.get('/list', async (req, res) => { //Listar todos los productos
    try {
        const [result] = await pool.query("Select * from productos");
        res.render('productos/list', { productos: result });
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});



router.get('/edit/:id', async (req, res) => { //mostrar producto que se quiere editar
    try {
        const {id}  =req.params;
        const [producto] = await pool.query("Select * from productos where PkProducto = ?", [id]);
        const productoEdit = producto[0];
        res.render('productos/edit', { producto: productoEdit });
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});

router.get('/delete/:id', async (req, res) => { //eliminar producto
    try {
        const {id}  =req.params;
        await pool.query("delete from productos where PkProducto = ?", [id]);
        res.redirect('/admin?deleteSuccess=true'); //actualizamos pagina y enviamos alerta de la eliminación correcta
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});

router.post('/admin', upload.single('Fotografia'), async (req, res) => { //agregamos productos

    const { Nombre, Color, Talla, Tipo, Precio, Estado, Cantidad, Categoria, Descripcion } = req.body; //captura datos del form
    const Fotografia = req.file ? `/img/${req.file.filename}` : null;  

    if (!Nombre || !Fotografia) {
        return res.status(400).json({ message: "Faltan datos" }); //valida si faltan datos
    }

    const newProducto = {
        Nombre, 
        Color, 
        Talla, 
        Precio, 
        Estado, 
        Tipo,
        Descripcion, 
        Cantidad, 
        Boutique_PKBoutique: '1',
        Categoria,
        Fotografia
    }; //crea objeto para insert

    await pool.query('INSERT INTO productos SET ?', [newProducto]); //insert datos
    res.redirect('/admin?addSuccess=true');

});



router.get('/Alquiler/:categoria?', async (req, res) => { //filtro para Alquiler
    try { 
        const { categoria } = req.params;
        let productos;

        if (categoria && categoria !== 'Todo') {
            [productos] = await pool.query("SELECT * FROM productos WHERE Tipo = 'Alquiler' AND Categoria = ?", [categoria]);
        } else {
            [productos] = await pool.query("SELECT * FROM productos WHERE Tipo = 'Alquiler'"); // traer el todo de alquiler
        }

        res.render('productos/list', { productos });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/Buscar', async (req, res) => {
    try {  
        const { filtro } = req.query; 
        let productos;

        if (filtro && filtro.trim() !== '') { 
            const searchQuery = `%${filtro}%`; // Agregar % para buscar coincidencias parciales
            [productos] = await pool.query(`
                SELECT * FROM productos 
                WHERE Tipo LIKE ? 
                OR Color LIKE ? 
                OR Nombre LIKE ? 
                OR Categoria LIKE ? 
                OR Descripcion LIKE ? 
                OR Estado LIKE ? 
                OR Filtros LIKE ?`, 
                [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery]
            );
        } else {
            [productos] = await pool.query("SELECT * FROM productos"); // Traer todo si no hay filtro
        }

        res.render('productos/list', { productos });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/cart/:PKProducto', async (req, res) => {
    try {
        const { PKProducto } = req.params; // cambia producto
        const [producto] = await pool.query("SELECT * FROM productos WHERE PkProducto = ?", [PKProducto]);

        if (!producto.length) {
            return res.status(404).send("Producto no encontrado"); // Si no hay producto, devolver error
        }

        res.render('productos/cart', { producto: producto[0] }); // Enviar solo el primer objeto
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



router.post('/edit/:PKProducto', upload.single('Fotografia'), async (req, res) => { //editar productos
    console.log("Datos del formulario:----------------------------------------------------------------------------------------------------------------------------", req.body);

    const {PKProducto} =req.params;
    const { Nombre, Color, Filtros, Talla, Precio, Tipo, Estado, Cantidad, Categoria, Descripcion } = req.body; //captura datos del form
    const Fotografia = req.file ? `/img/${req.file.filename}` : null;  

    const editProducto = {
        Nombre, 
        Color,
        Filtros, 
        Talla, 
        Precio, 
        Tipo,
        Estado, 
        Descripcion, 
        Cantidad, 
        Boutique_PKBoutique: '1',
        Categoria
    };
    console.log(editProducto)
    if (Fotografia) {
        editProducto.Fotografia = Fotografia;
    }

    await pool.query('UPDATE productos SET ? WHERE PkProducto = ?', [editProducto, PKProducto]); //inser datos
    res.redirect('/admin?addSuccess=true'); //actualizamos pagina
});

router.get('/venta/:categoria?', async (req, res) => { //filtro para ventas
    try { 
        const { categoria } = req.params;
        let productos;

        if (categoria && categoria !== 'Todo') { //si existe categoria
            [productos] = await pool.query("SELECT * FROM productos WHERE Tipo = 'Venta' AND Categoria = ?", [categoria]);
        } else { // si no existe categoria
            [productos] = await pool.query("SELECT * FROM productos WHERE Tipo = 'Venta'"); // Traer todo de venta
        }

        res.render('productos/list', { productos });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



export default router;