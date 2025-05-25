import { Router } from "express";
import pool from "../database.js";

const router = Router();

router.get('/checkout', async(req, res)=>{
    try{
        res.render('pedidos/checkout');
    }
    catch(err){
        res.status(500).json({message: err.message})
    }

});

router.get('/shoppingcart', async(req, res)=>{
    try{
        res.render('pedidos/shoppingCart');
    }
    catch(err){
        res.status(500).json({message: err.message})
    }

});

router.get('/adminPedido', async(req, res)=>{
    try{
        res.render('pedidos/adminPedido');
    }
    catch(err){
        res.status(500).json({message: err.message})
    }

});

export default router;