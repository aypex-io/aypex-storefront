import MmenuLight from 'mmenu-light'

document.addEventListener(
  'turbo:load', () => {
    const menu = new MmenuLight(document.querySelector('#mobileNav'), 'all')

    // eslint-disable-next-line no-unused-vars
    const navigator = menu.navigation({
      selectedClass: 'Selected',
      slidingSubmenus: true,
      theme: 'light',
      title: 'Main Menu'
    })

    const drawer = menu.offcanvas({
      // position: 'left'
    })

    //  Open the menu.
    document
      .querySelector('a[href="#mobileNav"]')
      .addEventListener('click', (evnt) => {
        evnt.preventDefault()
        drawer.open()
      })
  }
)
