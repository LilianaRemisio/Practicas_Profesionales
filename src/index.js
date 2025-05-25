import express from 'express';
import pool from "./database.js";
import { engine } from 'express-handlebars';
import morgan from 'morgan';
import {join, dirname} from 'path';
import { fileURLToPath } from 'url';
import boutiquesRoutes from './routes/boutiques.routes.js';
import productosRoutes from './routes/productos.routes.js';
import pedidosRoutes from './routes/pedidos.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import cookieParser from 'cookie-parser';



//Initialization
const app = express();
app.use(cookieParser());
const __dirname = dirname(fileURLToPath(import.meta.url));


//settings

app.set("port", process.env.PORT || 3000);
app.set("views", join(__dirname, "views"));

app.engine(".hbs", engine({
    defaultLayout: "main",
    layoutsDir: join(app.get("views"), "layouts"),
    partialsDir: join(app.get("views"), "partials"),
    extname: ".hbs",
    helpers: {
        eq: (a, b) => a === b,
        gt: (a, b) => a > b,
        lt: (a, b) => a < b,
        add: (a, b) => a + b,
        subtract: (a, b) => a - b,
        range: function (start, end) {
            let result = [];
            for (let i = start; i <= end; i++) {
                result.push(i);
            }
            return result; // Devuelve un array para que Handlebars pueda iterarlo con #each
        }
        
    }
}));

app.set("view engine", ".hbs");


//Middlewares
app.use(morgan('dev'));
app.use(express.urlencoded({extended: false}));
app.use(express.json());

//Routes
app.get('/', async (req, res)=>{
    try {
        const [result] = await pool.query("Select * from productos");
        const [fotosBoutique] = await pool.query("Select href from fotosBoutique where Tipo = 'fotosPortada'");
        console.log(fotosBoutique)
        res.render('index', { 
            productos: result,
            fotosBoutique: fotosBoutique });
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }
});

app.use(boutiquesRoutes);

app.use(productosRoutes);

app.use(pedidosRoutes);

app.use(usuariosRoutes);

//public files
app.use(express.static(join(__dirname, 'public')));

//Run Server
app.listen(app.get('port'), ()=>
    console.log('server listening on port: ', app.get('port')));