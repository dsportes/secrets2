package fr.sportes.secrets;

import java.io.IOException;
import java.io.StringWriter;
import java.util.Date;
import java.util.Hashtable;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.EntityNotFoundException;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.datastore.Text;
import com.google.appengine.api.datastore.Transaction;

public class Book {

	public static final String entityName = "Book";
	
	public static Book getBook(RootTransaction st, boolean readMark) 
		throws EntityNotFoundException {
		Key k = KeyFactory.createKey(st.rootKey, entityName, st.bookName);
		Entity entity = null;
		entity = st.ctx.getDS().get(st.ctx.getTR(), k);
		Book b = new Book(st, entity, k);
		if (readMark){
			Date d = new Date();
			entity.setProperty("rdt", d);
			entity.setProperty("rdf", st.from);
			st.ctx.getDS().put(st.ctx.getTR(), entity);	
		}
		return b;
	}

	public static Book newBook(RootTransaction st,
			String phrase, boolean archive) {
		Key k = KeyFactory.createKey(st.rootKey, entityName, st.bookName);
		Entity entity = new Entity(k);
		entity.setProperty("md5Key", st.md5Key);
		
		String ph = phrase;
		ph = (ph != null && ph.length() == 0) ? "" : 
			((ph.length() > 500) ? ph.substring(0, 500) : ph);
		entity.setProperty("phrase", ph);

		entity.setProperty("archive", archive);
		
		Date d = new Date();
		entity.setProperty("crt", d);
		entity.setProperty("crf", st.from);
		entity.setProperty("rdt", d);
		entity.setProperty("rdf", st.from);
		entity.setProperty("wtt", d);
		entity.setProperty("wtf", st.from);
		
		st.ctx.getDS().put(st.ctx.getTR(), entity);
		return new Book(st, entity, k);
	}

	public static Book newBook(RootTransaction st, JSONObject jsBook) {
		Key k = KeyFactory.createKey(st.rootKey, entityName, st.bookName);
		Entity entity = new Entity(k);
		entity.setProperty("md5Key", st.md5Key);
		
		String ph = (String)jsBook.get("phrase");
		ph = (ph != null && ph.length() == 0) ? "" : 
			((ph.length() > 500) ? ph.substring(0, 500) : ph);
		entity.setProperty("phrase", ph);

		entity.setProperty("archive", false);
		
		Long l;
		String s;
		l = (Long)jsBook.get("crt");
		s = (String)jsBook.get("crf");
		entity.setProperty("crt", l != null ? new Date(l) : new Date());
		entity.setProperty("crf", s != null ? s : st.from);
		entity.setProperty("rdt", l != null ? new Date(l) : new Date());
		entity.setProperty("rdf", s != null ? s : st.from);
		l = (Long)jsBook.get("wtt");
		s = (String)jsBook.get("wtf");
		entity.setProperty("wtt", l != null ? new Date(l) : new Date());
		entity.setProperty("wtf", s != null ? s : st.from);
		
		JSONArray secrets = (JSONArray)jsBook.get("secrets");
		if (secrets == null)
			secrets = new JSONArray();
		StringWriter out = new StringWriter();
		try {
			secrets.writeJSONString(out);
		} catch (IOException e) {
		}
		String ns = out.toString();
		Text nt = new Text(ns);
		entity.setProperty("secrets", nt);
		st.ctx.getDS().put(st.ctx.getTR(), entity);
		return new Book(st, entity, k);
	}

	public void doArchive(RootTransaction st, Long wtt, String wtf){
		Date d = wtt != null ? new Date(wtt) : new Date(); 
		String s = wtf != null ? wtf : st.from;
		entity.setProperty("rdt", d);
		entity.setProperty("rdf", s);
		entity.setProperty("wtt", d);
		entity.setProperty("wtf", s);
		entity.setProperty("archive", true);
		st.ctx.getDS().put(st.ctx.getTR(), entity);		
	}

	public void doArchPub(RootTransaction st, Long wtt, String wtf, boolean pub, boolean arch){
		Date d = wtt != null ? new Date(wtt) : new Date(); 
		String s = wtf != null ? wtf : st.from;
		// entity.setProperty("rdt", d);
		// entity.setProperty("rdf", s);
		entity.setProperty("wtt", d);
		entity.setProperty("wtf", s);
		entity.setProperty("pub", pub);
		entity.setProperty("archive", arch);
		st.ctx.getDS().put(st.ctx.getTR(), entity);		
	}

	@SuppressWarnings("unchecked")
	public void update(RootTransaction st, JSONObject jsBook){
		Long t = (Long)jsBook.get("wtt");
		Date d;
		if (t != null && t != 0)
			d = new Date(t);
		else
			d = new Date();
		// entity.setProperty("rdt", d);
		// entity.setProperty("rdf", st.from);
		entity.setProperty("wtt", d);
		entity.setProperty("wtf", st.from);
		JSONArray a = (JSONArray)jsBook.get("secrets");
		Hashtable<String, JSONObject> changedSecrets = new Hashtable<String, JSONObject>();
		for(Object x : a){
			JSONObject secret = (JSONObject)x;
			if (secret == null)
				continue;
			String name = (String)secret.get("name");
			if (name != null && name.length() != 0)
				changedSecrets.put(name, secret);
		}
		for(Object x : secrets){
			JSONObject secret = (JSONObject)x;
			String name = (String)secret.get("name");
			JSONObject nv = changedSecrets.get(name);
			if (nv != null){
				secret.put("wtt", nv.get("wtt"));
				secret.put("wtf", nv.get("wtf"));
				secret.put("value", nv.get("value"));
				changedSecrets.remove(name);
			}
		}
		for(JSONObject x : changedSecrets.values()){
			secrets.add(x);
		}
		StringWriter out = new StringWriter();
		try {
			secrets.writeJSONString(out);
		} catch (IOException e) {
		}
		String ns = out.toString();
		Text nt = new Text(ns);
		entity.setProperty("secrets", nt);
		st.ctx.getDS().put(st.ctx.getTR(), entity);		
	}
	
	private DBctx ctx;
	private Entity entity;
	private Key bookKey;

	private String name;
	private String md5Key;
	private String phrase;
	private boolean archive;
	private boolean pub;
	private Date crt;
	private String crf;
	private Date rdt;
	private String rdf;
	private Date wtt;
	private String wtf;
	private JSONArray secrets;

	public DBctx getCtx() {
		return ctx;
	}

	public String getName() {
		return name;
	}

	public String getMd5Key() {
		return md5Key;
	}

	public String getPhrase() {
		return phrase;
	}

	public boolean isArchive() {
		return archive;
	}

	public boolean isPub() {
		return pub;
	}

	public Date getCrt() {
		return crt;
	}

	public String getCrf() {
		return crf;
	}

	public Date getRdt() {
		return rdt;
	}

	public String getRdf() {
		return rdf;
	}

	public Date getWtt() {
		return wtt;
	}

	public String getWtf() {
		return wtf;
	}
	
	Book(DBctx ctx, Book srcBook, Key rootKey){
		this.ctx = ctx;
		Key k = KeyFactory.createKey(rootKey, Book.entityName, srcBook.name);
		this.entity = new Entity(k);
		this.bookKey = k;
		name = srcBook.name;
		md5Key = srcBook.md5Key;
		entity.setProperty("md5Key", md5Key);
		phrase = srcBook.phrase;
		entity.setProperty("phrase", phrase);
		archive = srcBook.archive;
		entity.setProperty("archive", archive);
		pub = srcBook.pub;
		entity.setProperty("pub", pub);
		crt = srcBook.crt;
		entity.setProperty("crt", crt);
		crf = srcBook.crf;
		entity.setProperty("crf", crf);
		rdt = srcBook.rdt;
		entity.setProperty("rdt", rdt);
		rdf = srcBook.rdf;
		entity.setProperty("rdf", rdf);
		wtt = srcBook.wtt;
		entity.setProperty("wtt", wtt);
		wtf = srcBook.wtf;
		entity.setProperty("wtf", wtf);
		Text text = (Text)srcBook.entity.getProperty("secrets");
		entity.setProperty("secrets", text);
		DatastoreService ds = ctx.getDS();
		Transaction tr = ctx.getTR();
		ds.put(tr, entity);
	}
	
	Book(RootTransaction st, Entity e, Key k){
		this.ctx = st.ctx;
		this.entity = e;
		this.bookKey = k;
		name = k.getName();
		md5Key = (String)entity.getProperty("md5Key");
		phrase = (String)entity.getProperty("phrase");
		archive = (Boolean)entity.getProperty("archive");
		pub = entity.hasProperty("pub") && (Boolean)entity.getProperty("pub");
		crt = (Date)entity.getProperty("crt");
		crf = (String)entity.getProperty("crf");
		rdt = (Date)entity.getProperty("rdt");
		rdf = (String)entity.getProperty("rdf");
		wtt = (Date)entity.getProperty("wtt");
		wtf = (String)entity.getProperty("wtf");
		Text text = (Text)entity.getProperty("secrets");
		String s = text != null ? text.getValue() : null;
		secrets = s != null ? (JSONArray)JSONValue.parse(s) : new JSONArray();
	}
	
	@SuppressWarnings("unchecked")
	public JSONObject toJSONObject(){
		JSONObject obj = new JSONObject();
		obj.put("name", name);
		obj.put("md5Key", md5Key);
		obj.put("archive", archive);
		obj.put("pub", pub);
		obj.put("phrase", phrase);
		obj.put("crt", crt.getTime());
		obj.put("crf", crf);
		obj.put("rdt", rdt.getTime());
		obj.put("rdf", rdf);
		obj.put("wtt", wtt.getTime());
		obj.put("wtf", wtf);
		obj.put("secrets", secrets);
		return obj;
	}
	
	public void delete(RootTransaction st){
		st.ctx.getDS().delete(st.ctx.getTR(), bookKey);
	}

	public static class BadKeyException extends Exception {
		
		public BadKeyException(String msg){
			super(msg);
		}

		/**
		 * 
		 */
		private static final long serialVersionUID = 1L;
	}
}
