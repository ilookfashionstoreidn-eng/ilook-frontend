import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import "./Layout.css";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { X, Menu, ChevronUp, ChevronDown, LogOut, Search } from "lucide-react";
import API from "../../api";
import { SIDEBAR_SECTIONS } from "./sidebarMenu";

// ── Sidebar rendering, driven by SIDEBAR_SECTIONS (see sidebarMenu.js) ──
// These pieces only read props, so they live outside Layout to keep the
// component body focused on state/effects instead of markup.

const NavIcon = ({ icon: Icon, color, nested }) =>
  Icon ? <Icon className="icon" style={nested ? { fontSize: "12px", marginRight: "8px", ...(color ? { color } : {}) } : undefined} /> : null;

const SidebarLink = ({ to, icon, label, iconColor, activeMenu, onNavigate, nested }) => {
  const menuKey = to.replace(/^\//, "");
  const isActive = activeMenu === menuKey;
  return (
    <li>
      <Link
        to={to}
        className={`${nested ? "dropdown-link" : "sidebar-link"} ${isActive ? "active" : ""}`}
        onClick={() => onNavigate(menuKey)}
      >
        {icon ? <><NavIcon icon={icon} color={iconColor} nested={nested} /> {label}</> : label}
      </Link>
    </li>
  );
};

const SidebarDropdown = ({ item, isOpen, activeMenu, openPaths, onToggle, onNavigate, hasAccess, ctx }) => {
  const isActive = openPaths.includes(activeMenu);
  return (
    <li>
      <div onClick={onToggle} className={`sidebar-link dropdown-toggle ${isActive ? "active" : ""}`}>
        <item.icon className="icon" /> {item.label}
        <span className={`arrow ${isOpen ? "open" : ""}`}>{isOpen ? <ChevronUp /> : <ChevronDown />}</span>
      </div>
      {isOpen && (
        <ul className="dropdown-menu show dropdown-menu-grouped">
          {item.groups.map((group, gi) => {
            const visibleItems = group.items.filter((it) => hasAccess(it.access) && (!it.when || it.when(ctx)));
            if (visibleItems.length === 0) return null;
            return (
              <React.Fragment key={group.label || gi}>
                {group.label && <div className="dropdown-group-label">{group.label}</div>}
                {visibleItems.map((it) => (
                  <SidebarLink key={it.to} to={it.to} icon={it.icon} label={it.label} iconColor={it.iconColor} activeMenu={activeMenu} onNavigate={onNavigate} nested />
                ))}
              </React.Fragment>
            );
          })}
        </ul>
      )}
    </li>
  );
};

const SidebarSection = ({ section, ctx, hasAccess, activeMenu, openGroups, groupPaths, toggleGroup, handleMenuClick }) => {
  if (section.when && !section.when(ctx)) return null;
  const visibleItems = section.items.filter((it) => (!it.access || hasAccess(it.access)) && (!it.when || it.when(ctx)));
  if (visibleItems.length === 0) return null;
  return (
    <>
      <li className="sidebar-group-label">{section.label}</li>
      {visibleItems.map((item) =>
        item.groups ? (
          <SidebarDropdown
            key={item.key}
            item={item}
            isOpen={!!openGroups[item.key]}
            activeMenu={activeMenu}
            openPaths={groupPaths[item.key] || []}
            onToggle={() => toggleGroup(item.key)}
            onNavigate={handleMenuClick}
            hasAccess={hasAccess}
            ctx={ctx}
          />
        ) : (
          <SidebarLink key={item.to} to={item.to} icon={item.icon} label={item.label} activeMenu={activeMenu} onNavigate={handleMenuClick} />
        )
      )}
    </>
  );
};

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [activeMenu, setActiveMenu] = useState("home");
  const [role, setRole] = useState("");
  const [menus, setMenus] = useState([]);
  const [menuSearch, setMenuSearch] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const ctx = { role };

  // Index SIDEBAR_SECTIONS once: which dropdown a given route path belongs
  // to (for auto-expand on deep-link/refresh) and which paths belong to a
  // given dropdown (for highlighting the toggle itself as active).
  const { pathToGroupKey, groupPaths, allGroupKeys } = useMemo(() => {
    const pathToGroupKey = {};
    const groupPaths = {};
    const allGroupKeys = [];
    SIDEBAR_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        if (!item.groups) return;
        allGroupKeys.push(item.key);
        const paths = [];
        item.groups.forEach((group) => {
          group.items.forEach((child) => {
            const key = child.to.replace(/^\//, "");
            paths.push(key);
            pathToGroupKey[key] = item.key;
          });
        });
        groupPaths[item.key] = paths;
      });
    });
    return { pathToGroupKey, groupPaths, allGroupKeys };
  }, []);

  // Live menu search. Every dropdown's <ul> is only *mounted* while its
  // openGroups[key] flag is true (see `{isOpen && (<ul>...)}` in
  // SidebarDropdown above) — it isn't just CSS-hidden — so a closed
  // group's links don't exist in the DOM at all yet. That means search has
  // to force every group open first (effect A, remembering prior state to
  // restore on clear) and only then hide/show individual links by text
  // match once they've actually mounted (effect B, re-run whenever
  // openGroups changes too).
  const prevOpenGroupsRef = useRef(null);
  useEffect(() => {
    if (menuSearch.trim()) {
      if (!prevOpenGroupsRef.current) {
        prevOpenGroupsRef.current = openGroups;
        const allOpen = {};
        allGroupKeys.forEach((key) => { allOpen[key] = true; });
        setOpenGroups(allOpen);
      }
    } else if (prevOpenGroupsRef.current) {
      setOpenGroups(prevOpenGroupsRef.current);
      prevOpenGroupsRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuSearch]);

  useEffect(() => {
    const menuEl = document.querySelector(".sidebar-menu");
    if (!menuEl) return;
    const query = menuSearch.trim().toLowerCase();
    const links = menuEl.querySelectorAll("a.sidebar-link, a.dropdown-link");
    const groupLabels = menuEl.querySelectorAll(".dropdown-group-label");

    if (!query) {
      links.forEach((a) => { a.closest("li").style.display = ""; });
      groupLabels.forEach((el) => { el.style.display = ""; });
      return;
    }

    links.forEach((a) => {
      const li = a.closest("li");
      li.style.display = a.textContent.trim().toLowerCase().includes(query) ? "" : "none";
    });

    // Sub-group headers ("Master Data", "Operasional", ...) sit as flat
    // siblings of the <li> items inside each dropdown-menu-grouped <ul>.
    // Hide any of them whose run of items (up to the next header) ends up
    // fully hidden, so search doesn't leave a trail of empty headers.
    groupLabels.forEach((label) => {
      let sibling = label.nextElementSibling;
      let hasVisibleItem = false;
      while (sibling && !sibling.classList.contains("dropdown-group-label")) {
        if (sibling.tagName === "LI" && sibling.style.display !== "none") hasVisibleItem = true;
        sibling = sibling.nextElementSibling;
      }
      label.style.display = hasVisibleItem ? "" : "none";
    });
  }, [menuSearch, openGroups]);

  // Sync active menu with current path, auto-opening whichever dropdown
  // (if any) owns that path.
  useEffect(() => {
    const path = location.pathname.replace(/^\//, "");
    if (path) {
      setActiveMenu(path);
      const key = pathToGroupKey[path];
      if (key) setOpenGroups((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    } else {
      setActiveMenu("home");
    }
  }, [location.pathname, pathToGroupKey]);

  const handleLogout = useCallback(async () => {
    try {
      await API.post("/logout");
    } catch (error) { }
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("foto");
    localStorage.removeItem("menus");
    localStorage.removeItem("loginTimestamp"); // Hapus timestamp login
    navigate("/");
  }, [navigate]);

  useEffect(() => {
    const userRole = localStorage.getItem("role"); // Ambil role dari localStorage
    setRole(userRole);

    try {
      const userMenus = JSON.parse(localStorage.getItem("menus") || "[]");
      setMenus(userMenus);
    } catch (e) {
      setMenus([]);
    }

    // Cek apakah session sudah expired (lebih dari 1 minggu)
    const checkSessionExpiry = () => {
      const loginTimestamp = localStorage.getItem("loginTimestamp");
      if (loginTimestamp) {
        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 1 minggu dalam milliseconds
        const now = Date.now();
        const timeSinceLogin = now - parseInt(loginTimestamp);

        if (timeSinceLogin > oneWeekInMs) {
          // Session expired, logout user
          handleLogout();
        }
      }
    };

    // Cek saat component mount
    checkSessionExpiry();

    // Cek setiap 1 jam untuk memastikan session tidak expired
    const expiryCheckInterval = setInterval(checkSessionExpiry, 60 * 60 * 1000);

    return () => {
      clearInterval(expiryCheckInterval);
    };
  }, [handleLogout]);

  const hasAccess = (menuKey) => {
    if (!menuKey) return true;
    if (role === "super-admin") return true;
    if (menuKey.includes(":")) {
      return menus.includes(menuKey);
    }
    return menus.includes(menuKey) || menus.some(m => m.startsWith(menuKey + ":"));
  };

  const toggleGroup = (key) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    setIsSidebarOpen(false);
  };
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="layout-container">
      {/* Overlay untuk mobile */}
      {isSidebarOpen && <div className="sidebar-overlay active" onClick={toggleSidebar}></div>}

      {/* Tombol Menu (hanya di mobile) */}
      <button className="menu-button" onClick={toggleSidebar}>
        {isSidebarOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <aside
        className={`sidebar ${isSidebarOpen ? "open" : ""} ${isSidebarCollapsed ? "collapsed" : ""} ${isSidebarCollapsed && isSidebarHovered ? "peek" : ""}`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div
          className="sidebar-header"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          style={{ cursor: "pointer" }}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <div className="sidebar-header-brand">
            <h3 className="sidebar-title">
              {(!isSidebarCollapsed || isSidebarHovered)
                ? <>iLOOK <span className="sidebar-title-dot">.</span></>
                : <>iL<span className="sidebar-title-dot">.</span></>
              }
            </h3>
          </div>
        </div>
        {(!isSidebarCollapsed || isSidebarHovered) && (
          <div className="sidebar-search">
            <Search className="sidebar-search-icon" size={13} />
            <input
              type="text"
              placeholder="Cari menu..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
            />
          </div>
        )}
        <nav className="sidebar-menu">
          <ul>
            {SIDEBAR_SECTIONS.map((section) => (
              <SidebarSection
                key={section.label}
                section={section}
                ctx={ctx}
                hasAccess={hasAccess}
                activeMenu={activeMenu}
                openGroups={openGroups}
                groupPaths={groupPaths}
                toggleGroup={toggleGroup}
                handleMenuClick={handleMenuClick}
              />
            ))}
          </ul>
        </nav>

        {/* Outside .sidebar-menu (which scrolls internally) so Logout stays
            pinned at the bottom of the sidebar instead of scrolling away
            with the menu list when several groups are expanded at once. */}
        <div className="sidebar-footer-item">
          <button className="sidebar-link is-logout" onClick={handleLogout}>
            <LogOut className="icon" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
