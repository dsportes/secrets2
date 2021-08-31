package fr.sportes.secrets;

import java.util.ConcurrentModificationException;
import java.util.Date;

import org.json.simple.JSONObject;

import com.google.appengine.api.datastore.EntityNotFoundException;

public class SecretsTransaction extends RootTransaction{
	
	////// Durée d'archive avant de pouvoir détruire (ms) /////
	public static final long minLapse = 1 * 60000 ;
	
	public SecretsTransaction(int cmd, String from, String pfx, String md5Pin, 
			JSONObject jsBook, JSONObject args){
		// String x = null; x.charAt(2); // Test d'exception
		this.cmd = cmd;
		this.md5Pin = md5Pin;
		this.prefix = pfx;
		this.from = (from == null || from.length() == 0) ? "Serveur" : from;
		
		if (this.cmd <= 0 || this.cmd > 12){
			status = 2; // commande inconnue
			return;
		}
		if (prefix == null || prefix.length() == 0){
			status = 3; // prefix absent
			return;
		}
		if (this.cmd > 2 && this.cmd < 10){
			if (jsBook == null){
				status = 4; // book absent
				return;
			}
			this.bookName = (String) jsBook.get("name");
			if(this.bookName == null || this.bookName.length() == 0){
				status = 5; // book name absent
				return;
			}
		}
		this.md5Key = (jsBook != null) ? (String) jsBook.get("md5Key") : null;
		if (this.cmd > 3  && this.cmd < 10){
			if (this.md5Key == null || this.md5Key.length() == 0){
				status = 6; // md5Key absent
				return;
			}
		}
		if (this.md5Pin != null && this.md5Pin.length() == 0)
			this.md5Pin = null;
		if ((this.cmd == 12 || (this.cmd > 3 && this.cmd < 10)) && md5Pin == null){
			status = 10; // PIN absent mais requis
			return;			
		}
		this.newMd5Pin = (String) args.get("newMd5Pin");
		if (this.cmd == 12 && newMd5Pin == null){
			if (this.newMd5Pin == null || this.newMd5Pin.length() == 0){
				status = 17; // newMd5Pin absent
				return;
			}			
		}
		
		this.ctx = new DBctx();
		while (ctx.retry()) {
			try {
				root = Prefix.getPrefix(ctx, prefix, false);
				
				if (root == null){
					status = 7; // prefixe non enregistré
					this.ctx.abort();
					return;										
				}

				this.isReadOnly = (this.md5Pin == null) || 
						(this.md5Pin != null && !this.md5Pin.equals(root.getPin()));
				if (this.cmd > 3 && this.cmd < 10 && this.isReadOnly){
					status = 8; // PIN invalide
					this.ctx.abort();
					return;															
				}
				
				this.rootKey = root.getKey();
				
				switch (cmd) {
					case 1 : { doListBooks(false); break;}
					case 2 : { doListBooks(true); break;}
					case 3 : { getBook(); break;}
					case 4 : { createBook(jsBook); break;}		
					case 5 : { updateBook(jsBook); break;}		
					case 6 : { createFullBook(jsBook); break;}		
					case 7 : { doArchive(jsBook); break;}		
					case 8 : { doDelete(); break;}		
					case 9 : { doArchPub(jsBook); break;}		
					case 10 : { doListBook(); break;}
					case 11 : { doGetPrefix(); break;}
					case 12 : {doChangePin(); break;}
				}
		    } catch (ConcurrentModificationException e) {
		        ctx.rethrow(e);
			} 
		}
				
	}

	@SuppressWarnings("unchecked")
	private void doChangePin(){
		result = new JSONObject();
		root.setPin(newMd5Pin);
		root.setTime(new Date());
		root.put();
		ctx.commit();
		status = 0;
		result.put("status", 0);
		result.put("time", root.getTimeS());
	}
	
	@SuppressWarnings("unchecked")
	private void doGetPrefix(){
		result = new JSONObject();
		result.put("time", root.getTimeS());
		boolean ro = this.md5Pin == null || !this.md5Pin.equals(root.getPin());
		result.put("ro", ro);
		status = 0;
		ctx.commit(); 
	}
	
	private void doListBook(){
		result2 = root.getBooksLong(this.isReadOnly, true);
		status = 0;
		ctx.commit();
	}

	@SuppressWarnings("unchecked")
	private void doListBooks(boolean arch){
		result = new JSONObject();
		result.put("books", root.getBooks(arch, this.isReadOnly));
		status = 0;
		result.put("status", status);
		result.put("ro", this.isReadOnly);		
		ctx.commit(); 
	}

	@SuppressWarnings("unchecked")
	private void createBook(JSONObject jsBook) throws ConcurrentModificationException {
		result = new JSONObject();
		try {
			book = Book.getBook(this, true);
		} catch (EntityNotFoundException e) {
			String phrase = (String)jsBook.get("phrase");
			boolean archive = false;
			book = Book.newBook(this, phrase, archive);
			status = 0;
			result.put("status", status);
			result.put("book", book.toJSONObject());
			ctx.commit();
			return;
		}
		if (book.getMd5Key().equals(this.md5Key)) {
			status = 0; // book existe déjà avec la bonne clé
			result.put("status", status);
			result.put("book", book.toJSONObject());
			ctx.commit();
			return;
		} else {
			status = 9; // book existe déjà avec clé différente
			result.put("status", status);
			ctx.commit();
			return;
		}
	}

	@SuppressWarnings("unchecked")
	private void createFullBook(JSONObject jsBook) throws ConcurrentModificationException {
		result = new JSONObject();
		try {
			book = Book.getBook(this, true);
		} catch (EntityNotFoundException e) {
			book = Book.newBook(this, jsBook);
			status = 0;
			result.put("status", status);
			ctx.commit();
			return;
		}
		status = 12; // book existe déjà clonage interdit
		result.put("status", status);
		ctx.commit();
		return;
	}

	@SuppressWarnings("unchecked")
	private void updateBook(JSONObject jsBook) throws ConcurrentModificationException {
		result = new JSONObject();
		try {
			book = Book.getBook(this, false);
		} catch (EntityNotFoundException e) {
			book = Book.newBook(this, jsBook);
//			status = 11; // book inexistant
//			result.put("status", status);
//			ctx.commit();
//			return;
		}
		if (book.isArchive()){
			status = 18; // book en protection d'écriture
			result.put("status", status);
			ctx.commit();
			return;	
		}
		if (book.getMd5Key().equals(this.md5Key)) {
			book.update((RootTransaction)this, jsBook);
			status = 0;
			result.put("status", status);
			ctx.commit();
			return;
		} else {
			status = 9; // book a une clé différente
			result.put("status", status);
			ctx.commit();
			return;
		}
	}

	@SuppressWarnings("unchecked")
	private void doArchive(JSONObject jsBook) throws ConcurrentModificationException {
		result = new JSONObject();
		Long wtt = (Long)jsBook.get("wtt");
		String wtf = (String)jsBook.get("wtf");
		try {
			book = Book.getBook(this, false);
		} catch (EntityNotFoundException e) {
			status = 11; // book inexistant
			result.put("status", status);
			ctx.commit();
			return;
		}
		if (book.getMd5Key().equals(this.md5Key)) {
			if (!book.isArchive()){
				status = 0; // book existe déjà avec la bonne clé
				book.doArchive(this, wtt, wtf);
				result.put("status", status);
				ctx.commit();
				return;
			} else {
				status = 13; // book déjà archivé
				result.put("status", status);
				ctx.commit();
				return;				
			}
		} else {
			status = 9; // book existe déjà avec clé différente
			result.put("status", status);
			ctx.commit();
			return;
		}
	}

	@SuppressWarnings("unchecked")
	private void doArchPub(JSONObject jsBook) throws ConcurrentModificationException {
		result = new JSONObject();
		Long wtt = (Long)jsBook.get("wtt");
		String wtf = (String)jsBook.get("wtf");
		boolean pub = (Boolean)jsBook.get("pub");
		boolean arch = (Boolean)jsBook.get("archive");
		try {
			book = Book.getBook(this, false);
		} catch (EntityNotFoundException e) {
			status = 11; // book inexistant
			result.put("status", status);
			ctx.commit();
			return;
		}
		if (book.getMd5Key().equals(this.md5Key)) {
			if (book.isPub() != pub || book.isArchive() != arch)
				book.doArchPub(this, wtt, wtf, pub, arch);
			status = 0; 
			result.put("status", status);
			ctx.commit();
			return;
		} else {
			status = 9; // book a clé différente
			result.put("status", status);
			ctx.commit();
			return;
		}
	}

	@SuppressWarnings("unchecked")
	private void doDelete() throws ConcurrentModificationException {
		result = new JSONObject();
		try {
			book = Book.getBook(this, false);
		} catch (EntityNotFoundException e) {
			status = 0; // book inexistant
			result.put("status", status);
			ctx.commit();
			return;
		}
		if (book.getMd5Key().equals(this.md5Key)) {
			if (book.isArchive()){
				long now = new Date().getTime();
				long arch = book.getWtt().getTime();
				if ((now - arch) > minLapse){
					status = 0; 
					book.delete(this);
					result.put("status", status);
					ctx.commit();
					return;
				} else {
					status = 15; // book doit être archivé depuis plus de ...
					result.put("status", status);
					ctx.commit();
					return;									
				}
			} else {
				status = 14; // book doit être archivé
				result.put("status", status);
				ctx.commit();
				return;				
			}
		} else {
			status = 9; // book a une clé différente
			result.put("status", status);
			ctx.commit();
			return;
		}
	}

	@SuppressWarnings("unchecked")
	private void getBook(){
		result = new JSONObject();
		try {
			book = Book.getBook(this, true);
			if (this.cmd == 3 && this.isReadOnly && !book.isPub()){
				status = 16; // PIN obligatoire pour un book non public
				this.ctx.abort();
				return;															
			}
		} catch (EntityNotFoundException e) {			
			status = 11; // book inexistant
			result.put("status", status);
			ctx.commit();
			return;
		}
		String bk = book.getMd5Key();
		if (this.md5Key != null && !bk.equals(this.md5Key)){
			status = 9; // mauvaise clé
			result.put("status", status);
			ctx.commit();
			return;			
		}
		status = 0;
		result.put("status", status);
		JSONObject obj = book.toJSONObject();
		obj.put("ro", this.isReadOnly);
		result.put("book", obj);
		ctx.commit();
	}

}
