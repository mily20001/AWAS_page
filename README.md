
# Introduction to the project
## Project objective
Web application has been created as university project for Applied Web Security classes. It is designed to be vulnerable and because of that code quality is rather low.
## Web application description
This web application is the website for Helsinki region citizens, hosted by one of the power plant companies. The web application has three types of different user roles:
* **Access without logging in** (possible for every citizen): Everyone can see the current status of each power plant, for example to know if an electricity problem is caused by some local problems (like a broken transformer) or by more serious problems (like a power plant issue).
* **Normal unprivileged users** (e.g. facility managers): They can directly contact power plant employees if there are any problems or they can receive information’s about planned power shortages.
* **Admin users** (power plant employees): They can actually manage each power plant status and they can send/receive messages from other users.

To use the web application, install `node.js` and start it with the following command: `node server.js`
# Explanation of the project
The following core defence mechanisms are violated in the web application:
* **Handling user access to the application’s data and functionality to prevent users from gaining unauthorized access:** 
A malicious person can send messages in the message board without any authentication to other users. He can also see the user list (the list is accessible simply by knowing the URL of the resource users.html) and he can even manage each power plant without any user account (by modifying the HTTP header. This is a violation against proper **authentication**. There is also a violation against proper **authorization**, because a normal user (which has no granted permission) can see the list of all registered users and he can modify the power plant status. This is also known as privilege elevation, because the lower privilege normal user access functions reserved for higher privilege users (admin).

* **Handling user input to the application’s functions to prevent malformed input from causing undesirable behavior:**
The web application’s message board uses **unfiltered** user input to generate the dynamic webpage. The user input is not validated correctly (there is no filter or sanitization) and so a malicious person can send arbitrary input data to the web server. He can insert for example special characters such as `<` `>` so he can control the representation of the dynamic webpage and he can insert `<script>` tags to run JavaScript that means that the web application is susceptible towards stored **Cross Site Scripting** (stored XSS).
Because of possible stored XSS attacks, it is also possible to perform easy **CSRF** attacks against admins for example. In this particular case, it is not very useful for attackers, since authorization and authentication is completely vulnerable, so all attacks can be done without CSRF. Session stealing is not possible, since token cookie is set as HTTP-only, so as long as an attacker is not doing a man-in-the-middle attack, he doesn’t have access to session token.
To change the status of each power plant, the web application uses the information sent by the client. That means that the **user can modify the HTTP header** which was set by the application itself (the user has full control over his client and can modify or bypass this security implementation; the developer has made a false assumption that the status cannot be changed since the normal user interface does not allow this).
* **Handling attackers to ensure that the application behaves appropriately when being directly targeted, taking suitable defensive and offensive measures to frustrate the attacker:**
There is also no time-delay into every request response cycle – for example – for logon with a user account. This allows an attacker to perform brute-force-attacks and since you can get a 6 list of users without logging in, it can be a very efficient way to break in if someone has a weak password.

* **Managing the application itself by enabling administrators to monitor its activities and configure its functionality:**
There is no **management interface** for an admin user of the web application, so he can’t assign roles to users, monitor user behaviours, check logs for detecting attacks and errors, applying security patches or configure the application’s security settings. This is only possible for the server admin.
