package fr.sportes.secrets;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.EntityNotFoundException;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;

public class Prefix {
	
	public static final String entityName = "Prefix";
	
	private DBctx ctx;

	private Key k = null;
	
	private Entity entity = null;
	
	public Key getKey(){
		return k;
	}
	
	public Date getTime(){
		return (Date) entity.getProperty("time");
	}
	public String getTimeS(){
		return sdf.format((Date) entity.getProperty("time"));
	}
	
	public void setTime(Date value){
		entity.setProperty("time", value);
	}

	public String getPin(){
		return (String) entity.getProperty("pin");
	}
	
	public void setPin(String value){
		entity.setProperty("pin", value);
	}

	public void put(){
		ctx.getDS().put(ctx.getTR(), entity);
	}
	
	public void delete(){
		ctx.getDS().delete(ctx.getTR(), k);
		
		Query q = new Query(Book.entityName);
		q.setAncestor(k);
		q.setKeysOnly();
		PreparedQuery pq = ctx.getDS().prepare(ctx.getTR(), q);
		for(Entity e : pq.asIterable()){
			Key x = e.getKey();
			ctx.getDS().delete(ctx.getTR(), x);
		}

//		Query qs = new Query(Secret.entityName);
//		qs.setAncestor(k);
//		qs.setKeysOnly();
//		PreparedQuery pqs = ctx.getDS().prepare(ctx.getTR(), qs);
//		for(Entity e : pqs.asIterable()){
//			Key x = e.getKey();
//			ctx.getDS().delete(ctx.getTR(), x);
//		}

	}
	
	@SuppressWarnings("unchecked")
	public JSONArray getBooks(boolean arch, boolean restrict){
		ArrayList<String> ar = new ArrayList<String>();
		Query q = new Query(Book.entityName);
		q.setAncestor(k);
		PreparedQuery pq = ctx.getDS().prepare(ctx.getTR(), q);
		for(Entity e : pq.asIterable()){
			String name = e.getKey().getName();
			if (restrict && !name.startsWith("/"))
				continue;
			boolean isArchive = (Boolean)e.getProperty("archive");
			if ((arch && isArchive) || (!arch && !isArchive))
					ar.add(name);
		}
		String[] n = ar.toArray(new String[ar.size()]);
		Arrays.sort(n);
		JSONArray ax = new JSONArray();
		for(String s : n) ax.add(s);
		return ax;
	}
	
	/**
	 * Lit le préfixe de nom donné.
	 * L'option toCreate créé ce préfixe s'il n'existe pas (sinon returne null)
	 **/
	public static Prefix getPrefix(DBctx ctx, String name, boolean toCreate) {
		Prefix p = new Prefix(ctx, name, toCreate);
		return p.entity == null ? null : p;
	}
	
	private Prefix(DBctx ctx, String name, boolean toCreate){
		this.ctx = ctx;
		k = KeyFactory.createKey(entityName, name);
		try {
			entity = ctx.getDS().get(ctx.getTR(), k);
		} catch (EntityNotFoundException e) {
			if (toCreate)
					entity = new Entity(entityName, name);
		}
	}
	
	public ArrayList<String> getBookNames(){
		ArrayList<String> ax = new ArrayList<String>();
		Query q = new Query(Book.entityName);
		q.setAncestor(k);
		PreparedQuery pq = ctx.getDS().prepare(ctx.getTR(), q);
		for(Entity e : pq.asIterable()){
			String name = (String)e.getKey().getName();
			if (name == null || name.length() == 0)
				continue;
			ax.add(name);
		}
		return ax;
	}

	@SuppressWarnings("unchecked")
	public JSONArray getBooksLong(boolean ro, boolean rawDh){
		JSONArray ax = new JSONArray();
		Query q = new Query(Book.entityName);
		q.setAncestor(k);
		PreparedQuery pq = ctx.getDS().prepare(ctx.getTR(), q);
		for(Entity e : pq.asIterable()){
			String name = (String)e.getKey().getName();
			if (name == null || name.length() == 0)
				continue;
			boolean b2 = e.hasProperty("pub") && (Boolean)e.getProperty("pub");
			if (!b2 && ro)
				continue;
			JSONObject obj = new JSONObject();
			obj.put("name", name);
			boolean b = (Boolean)e.getProperty("archive");
			obj.put("archive", b);
			obj.put("pub", b2);
			Date d = (Date)e.getProperty("crt");
			if (rawDh)
				obj.put("crt", d != null ? d.getTime() : 0);
			else
				obj.put("crt", d != null ? sdf.format(d) : "");
			obj.put("crf", (String)e.getProperty("crf"));
			d = (Date)e.getProperty("rdt");
			if (rawDh)
				obj.put("rdt", d != null ? d.getTime() : 0);
			else
				obj.put("rdt", d != null ? sdf.format(d) : "");
			obj.put("rdf", (String)e.getProperty("rdf"));
			d = (Date)e.getProperty("wtt");			if (rawDh)
				obj.put("wtt", d != null ? d.getTime() : 0);
			else
				obj.put("wtt", d != null ? sdf.format(d) : "");
			obj.put("wtf", (String)e.getProperty("wtf"));
			obj.put("md5Key", (String)e.getProperty("md5Key"));
			obj.put("phrase", (String)e.getProperty("phrase"));
			ax.add(obj);
		}
		return ax;
	}
	
	@SuppressWarnings("unchecked")
	public static JSONArray getAll(){
		JSONArray a = new JSONArray();
		DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Prefix"); // Ne marche pas TOUJOURS en sp�cifiant un kind !
		// q.addSort("_key_", SortDirection.DESCENDING); - Pas applicable sans ancetre
		PreparedQuery pq = ds.prepare(q);
		for(Entity e : pq.asIterable()){
			String s = e.getKind();
			if (!s.equals("Prefix"))
				continue;
			String n = e.getKey().getName();
			String t = sdf.format((Date)e.getProperty("time"));
			String p = (String)e.getProperty("pin");
			JSONObject obj = new JSONObject();
			obj.put("name", n);
			obj.put("time", t);
			obj.put("pin", p);
			a.add(obj);
		}
		return a;
	}
	
	public static final SimpleDateFormat sdf = new SimpleDateFormat("yyy-MM-dd HH:mm:ss",
			Locale.FRANCE);
	
	public static final TimeZone timezone = TimeZone.getTimeZone("Europe/Paris");

	static {
		sdf.setTimeZone(timezone);
	}
		
}
