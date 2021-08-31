package fr.sportes.secrets;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;

import java.security.Principal;
import java.util.ConcurrentModificationException;
import java.util.logging.Level;
import java.util.logging.Logger;

@SuppressWarnings("serial")
public class AdminServlet extends HttpServlet {
	public static final Logger log = Logger.getLogger("fr.sportes");
	
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
			throws IOException {
		resp.setContentType("text/html");
		resp.setCharacterEncoding("UTF-8");
		byte[] buf = new byte[4096];
		int l = 0;
		OutputStream os = resp.getOutputStream();
		InputStream is = getServletContext().getResource("/admin/admin.html").openStream();
		while((l = is.read(buf)) > 0)
			os.write(buf, 0, l);
		is.close();
		/*
		resp.getWriter().println("ADMIN - Bonjour, le " + new Date().toString());		
		if (SystemProperty.environment.value() !=
		    SystemProperty.Environment.Value.Production) {
			log.warning("Réception d'un GET sur admin !?!");
		}
		*/
	}
	
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
	throws IOException {
		String uri = req.getRequestURI();
		if (uri.equals("/admin")) {
			Principal p = req.getUserPrincipal();
			if (p == null) {
				log.severe("Accès /admin par inconnu");
				resp.sendError(401);
				return;
			}
			UserService userService = UserServiceFactory.getUserService();
			if (!userService.isUserAdmin()) {
				log.severe("Accès /admin par (non admin)" + p.getName());
				resp.sendError(401);
				return;
			}
		}
		InputStream is = req.getInputStream();
		byte[] buf = new byte[4096];
		ByteArrayOutputStream os = new ByteArrayOutputStream(16192);
		int l = 0;
		while( (l = is.read(buf)) > 0) os.write(buf, 0, l);
		String body = os.toString("UTF-8");
		os.close();
		is.close();
		resp.setCharacterEncoding("UTF-8");
		try {
			JSONObject obj = (JSONObject) JSONValue.parse(body);
			if (obj == null){
				log.log(Level.SEVERE, "POST argument absent ou mal formé");
				resp.sendError(521);
				return;
			}
			long cmd = 0;
			String prefix = null;
			String md5Pin = null;
			String book = null;
			String source = null;
			cmd = (Long) obj.get("cmd");
			prefix = (String) obj.get("prefix");
			md5Pin = (String) obj.get("md5Pin");
			book = (String) obj.get("book");
			source = (String) obj.get("source");
			AdminTransaction tr = new AdminTransaction((int)cmd, prefix, md5Pin, book, source);
			int status = tr.getStatus();
			if (status == 0){
				resp.setContentType("application/json");
				resp.getWriter().print(tr.getResult());				
			} else {
				resp.sendError(520 + status);				
			}
		} catch (ClassCastException e) {
			log.log(Level.SEVERE, e.getMessage(), e);
			resp.sendError(501);
		} catch (ConcurrentModificationException e){
			log.log(Level.SEVERE, e.getMessage(), e);
			resp.sendError(502);			
		}
	}
}
