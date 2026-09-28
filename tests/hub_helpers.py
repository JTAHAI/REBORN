"""Follow visible primary navigation before selecting a secondary destination.
No DOM mutation or private application-function calls are used by this helper.
"""
GROUPS={'overview':'jetta','workshop':'jetta','town':'town','stories':'drive','echoes':'drive','journal':'journal','memories':'journal'}
def hub_tab(page,name):
    group=GROUPS[name]
    picker=page.locator('#hub-section-select')
    if picker.is_visible():picker.select_option(group)
    else:page.locator('[data-hub-group="'+group+'"]').click()
    page.locator('#ux-tab-'+name).click()
