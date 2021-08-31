package fr.sportes.secrets;

import java.io.IOException;
import java.io.StringWriter;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.google.appengine.api.datastore.Key;

public abstract class RootTransaction {
	int status = 0;
	
	JSONObject result = null;
	JSONArray result2 = null;
	
	int cmd;
	String prefix;
	String from;
	String md5Key;
	String bookName;
	String source;
	String md5Pin;
	String newMd5Pin;
	DBctx ctx;
	Prefix root;
	Key rootKey;
	boolean isReadOnly;
	Book book;

	public int getStatus() {return status;}
	
	public String getResult() throws IOException {
		if (status == 0){
			StringWriter out = new StringWriter();
			if (result != null)
				result.writeJSONString(out);
			else
				result2.writeJSONString(out);
			String r = out.toString();
			return r;
		} else
			return "{ status :" + status + "}";
	}

}
