package fr.sportes.secrets;

import java.util.ArrayList;
import java.util.ConcurrentModificationException;
import java.util.Date;

import org.json.simple.JSONObject;

import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.EntityNotFoundException;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;

public class AdminTransaction extends RootTransaction{
		
	public AdminTransaction(int cmd, String prefix, String md5Pin, String book, String source){
		this.cmd = cmd;
		this.prefix = prefix;
		this.md5Pin = md5Pin;
		this.bookName = book;
		this.source = source;
		if (this.cmd <= 0 || this.cmd > 7){
			status = 2; // commande inconnue
			return;
		}
		switch (cmd) {
			case 1 : { doDir(); break;}
			case 2 : { doNewPrefix(); break;}
			case 3 : { doDeletePrefix(); break;}		
			case 4 : { doListBook(false); break;}		
			case 5 : { doDeleteBook(); break;}	
			case 6 : { doGetPrefix(); break;}		
			case 7 : { doListBook(true); break;}		
		}
	}
		
	@SuppressWarnings("unchecked")
	private void doGetPrefix(){
		if (prefix == null || prefix.length() == 0){
			status = 3; // prefix absent
			return;
		}
		DBctx ctx = new DBctx();
		while (ctx.retry()) {
		try {
			root = Prefix.getPrefix(ctx, prefix, false);
			if (root == null){
				status = 7; // prefixe non enregistré
				this.ctx.abort();
				return;										
			}
			result = new JSONObject();
			result.put("pin", root.getPin());
			result.put("time", root.getTimeS());
			status = 0;
			ctx.commit();
	    } catch (ConcurrentModificationException e) {
	        ctx.rethrow(e);
		} 
		}		
	}

	private void doDir(){
		result2 = Prefix.getAll();
		status = 0;
	}

	@SuppressWarnings("unchecked")
	private void doNewPrefix() throws ConcurrentModificationException {
		result = new JSONObject();
		if (prefix == null || prefix.length() == 0){
			status = 3; // prefix absent
			return;
		}
		if (md5Pin == null || md5Pin.length() == 0){
			status = 4; // PIN absent
			return;
		}
		
		DBctx ctx = new DBctx();
		if (source != null)
			ctx.setMulti();
		while (ctx.retry()) {
		try {
			Prefix src = null;
			if (source != null){
				src = Prefix.getPrefix(ctx, source, false);
				if (src == null) {
					status = 19; // prefix source inconnu
					ctx.abort();
					return;
				}
			}
			Prefix p = Prefix.getPrefix(ctx, prefix, true);
			p.setPin(md5Pin);
			p.setTime(new Date());
			p.put();
			if (src != null){
				ArrayList<String> lb = src.getBookNames();
				for(String name : lb){
					Key k = KeyFactory.createKey(src.getKey(), Book.entityName, name);
					try {
						Entity entity = ctx.getDS().get(ctx.getTR(), k);
						Book b = new Book(this, entity, k);
						new Book(ctx, b, p.getKey());
					} catch (EntityNotFoundException e) {
						continue;
					}
				}
			}
			ctx.commit();
			status = 0;
			result.put("status", 0);
	    } catch (ConcurrentModificationException e) {
	        ctx.rethrow(e);
		} 
		}
		
	}

	@SuppressWarnings("unchecked")
	private void doDeletePrefix(){
		result = new JSONObject();
		if (prefix == null || prefix.length() == 0){
			status = 3; // prefix absent
			return;
		}
		DBctx ctx = new DBctx();
		while (ctx.retry()) {
		try {
			Prefix p = Prefix.getPrefix(ctx, prefix, false);
			if (p != null)
				p.delete();
			ctx.commit();
			status = 0;
			result.put("status", 0);
	    } catch (ConcurrentModificationException e) {
	        ctx.rethrow(e);
		} 
		}		
	}

	private void doListBook(boolean rawDh){
		if (prefix == null || prefix.length() == 0){
			status = 3; // prefix absent
			return;
		}
		DBctx ctx = new DBctx();
		while (ctx.retry()) {
		try {
			Prefix p = Prefix.getPrefix(ctx, prefix, false);
			if (p != null){
				result2 = p.getBooksLong(false, rawDh);
				status = 0;
			} else {
				status = 7; // préfixe non enregistré
				ctx.abort();
				return;														
			}
			ctx.commit();
	    } catch (ConcurrentModificationException e) {
	        ctx.rethrow(e);
		} 
		}		
	}

	@SuppressWarnings("unchecked")
	private void doDeleteBook(){
		result = new JSONObject();
		if (prefix == null || prefix.length() == 0){
			status = 3; // prefix absent
			return;
		}
		if (bookName == null || bookName.length() == 0){
			status = 5; // book absent
			return;
		}

		this.ctx = new DBctx();
		while (ctx.retry()) {
		try {
			root = Prefix.getPrefix(ctx, prefix, false);
			
			if (root == null){
				status = 7; // préfixe non enregistré
				this.ctx.abort();
				return;										
			}

			this.rootKey = root.getKey();

			try {
				book = Book.getBook((RootTransaction)this, false);
				book.delete(this);
				status = 0;
				result.put("status", status);
				ctx.commit();
			} catch (EntityNotFoundException e) {			
				status = 6; // book inexistant
				result.put("status", status);
				ctx.commit();
				return;
			}
	    } catch (ConcurrentModificationException e) {
	        ctx.rethrow(e);
		} 
		}		
	}

}
