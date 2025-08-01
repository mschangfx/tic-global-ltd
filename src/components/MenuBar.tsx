import React from 'react';
import Image from 'next/image';
import styles from '../styles/MenuBar.module.css'; // We will create this CSS module next

const MenuBar: React.FC = () => {
  return (
    <header className={styles.navbarWrapper}>
      <nav className={styles.navbar}>
        <div className={styles.navbarLogo}>
          <Image src="/logo.png" alt="WinWin Pay Logo" width={40} height={40} />
          <span className={styles.logoText}>winwin pay</span>
        </div>
        <ul className={styles.navbarLinks}>
          <li><a href="#">About Us <span className={styles.dropdownArrow}>&#9662;</span></a></li>
          <li><a href="#">Manage Tokens <span className={styles.dropdownArrow}>&#9662;</span></a></li>
          <li><a href="#">WWP Token</a></li>
          <li><a href="#">Learn <span className={styles.dropdownArrow}>&#9662;</span></a></li>
          <li><a href="#">Contact Us</a></li>
        </ul>
        <div className={styles.navbarActions}>
          <div className={styles.languageSelector}>
            <Image src="/uk-flag.png" alt="UK Flag" width={20} height={15} className={styles.flagIcon} />
            <span>English</span>
            <span className={styles.dropdownArrow}>&#9662;</span>
          </div>
          <button className={styles.loginButton}>LOGIN</button>
        </div>
      </nav>
    </header>
  );
};

export default MenuBar;